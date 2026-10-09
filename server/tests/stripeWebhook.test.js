import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/db/client.js", () => ({
  prisma: {
    booking: { findUnique: vi.fn(), update: vi.fn() },
    payment: { update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("../src/services/gateCode.js", () => ({
  generateGateCode: vi.fn(() => "123456"),
}));

vi.mock("../src/services/bookingConfirmationEmail.js", () => ({
  sendBookingConfirmationEmail: vi.fn(),
}));

import { prisma } from "../src/db/client.js";
import { generateGateCode } from "../src/services/gateCode.js";
import { sendBookingConfirmationEmail } from "../src/services/bookingConfirmationEmail.js";
import { handleStripeEvent } from "../src/services/stripeWebhook.js";

// What the transaction's booking.update resolves to, with its included
// user and court, the shape handlePaymentSucceeded hands to the email.
const confirmedBooking = {
  id: 1,
  status: "confirmed",
  gateCode: "123456",
  user: { name: "Alex", email: "alex@example.com" },
  court: { name: "Court 1" },
};

function succeededEvent(bookingId = 1, paymentIntentId = "pi_1") {
  return {
    type: "payment_intent.succeeded",
    data: { object: { id: paymentIntentId, metadata: { bookingId: String(bookingId) } } },
  };
}

function failedEvent(bookingId = 1, paymentIntentId = "pi_1") {
  return {
    type: "payment_intent.payment_failed",
    data: { object: { id: paymentIntentId, metadata: { bookingId: String(bookingId) } } },
  };
}

function pendingBooking(overrides = {}) {
  return {
    id: 1,
    status: "pending",
    payment: { stripePaymentIntentId: "pi_1", status: "pending" },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  prisma.$transaction.mockResolvedValue([confirmedBooking, {}]);
});

describe("handleStripeEvent, payment_intent.succeeded", () => {
  it("updates the booking and the payment together in one transaction", async () => {
    prisma.booking.findUnique.mockResolvedValue(pendingBooking());

    await handleStripeEvent(succeededEvent());

    expect(prisma.booking.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: "confirmed", gateCode: "123456" },
      include: { user: true, court: true },
    });
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { bookingId: 1 },
      data: { status: "succeeded" },
    });
    expect(generateGateCode).toHaveBeenCalled();
  });

  it("sends the booking confirmation email with the confirmed booking", async () => {
    prisma.booking.findUnique.mockResolvedValue(pendingBooking());

    await handleStripeEvent(succeededEvent());

    expect(sendBookingConfirmationEmail).toHaveBeenCalledWith(confirmedBooking);
  });

  it("still confirms the booking when the confirmation email fails to send", async () => {
    prisma.booking.findUnique.mockResolvedValue(pendingBooking());
    sendBookingConfirmationEmail.mockRejectedValue(new Error("Resend is down"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(handleStripeEvent(succeededEvent())).resolves.toBeUndefined();

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("does nothing when the booking no longer exists", async () => {
    prisma.booking.findUnique.mockResolvedValue(null);

    await handleStripeEvent(succeededEvent());

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("does nothing when the booking was already confirmed, a duplicate delivery of the same event", async () => {
    prisma.booking.findUnique.mockResolvedValue(
      pendingBooking({
        status: "confirmed",
        payment: { stripePaymentIntentId: "pi_1", status: "succeeded" },
      }),
    );

    await handleStripeEvent(succeededEvent());

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("does nothing when the booking was reclaimed and now holds a different payment intent", async () => {
    prisma.booking.findUnique.mockResolvedValue(
      pendingBooking({ payment: { stripePaymentIntentId: "pi_new", status: "pending" } }),
    );

    await handleStripeEvent(succeededEvent(1, "pi_old"));

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("does nothing when the booking has no payment attached, for example it was already released", async () => {
    prisma.booking.findUnique.mockResolvedValue(pendingBooking({ payment: null }));

    await handleStripeEvent(succeededEvent());

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe("handleStripeEvent, payment_intent.payment_failed", () => {
  it("marks the payment failed and leaves the booking pending", async () => {
    prisma.booking.findUnique.mockResolvedValue(pendingBooking());

    await handleStripeEvent(failedEvent());

    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { bookingId: 1 },
      data: { status: "failed" },
    });
    expect(prisma.booking.update).not.toHaveBeenCalled();
    expect(sendBookingConfirmationEmail).not.toHaveBeenCalled();
  });

  it("does nothing when the booking is no longer pending, for example it was cancelled first", async () => {
    prisma.booking.findUnique.mockResolvedValue(pendingBooking({ status: "cancelled" }));

    await handleStripeEvent(failedEvent());

    expect(prisma.payment.update).not.toHaveBeenCalled();
  });

  it("does nothing when the event's payment intent no longer matches the booking's current payment", async () => {
    prisma.booking.findUnique.mockResolvedValue(
      pendingBooking({ payment: { stripePaymentIntentId: "pi_new", status: "pending" } }),
    );

    await handleStripeEvent(failedEvent(1, "pi_old"));

    expect(prisma.payment.update).not.toHaveBeenCalled();
  });
});

describe("handleStripeEvent, any other event type", () => {
  it("is acknowledged without touching the database", async () => {
    await handleStripeEvent({ type: "charge.refunded", data: { object: {} } });

    expect(prisma.booking.findUnique).not.toHaveBeenCalled();
  });
});
