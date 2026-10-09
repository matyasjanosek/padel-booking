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

vi.mock("../src/hardware/index.js", () => ({
  scheduleLighting: vi.fn(),
}));

import { prisma } from "../src/db/client.js";
import { generateGateCode } from "../src/services/gateCode.js";
import { sendBookingConfirmationEmail } from "../src/services/bookingConfirmationEmail.js";
import { scheduleLighting } from "../src/hardware/index.js";
import { handleStripeEvent } from "../src/services/stripeWebhook.js";

// What the transaction's booking.update resolves to, with its included
// user and court, the shape handlePaymentSucceeded hands to the email and
// the court and times it hands to the lighting schedule.
const confirmedBooking = {
  id: 1,
  courtId: 2,
  status: "confirmed",
  gateCode: "123456",
  startTime: new Date("2030-06-10T07:00:00.000Z"),
  endTime: new Date("2030-06-10T08:00:00.000Z"),
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

// `stripe trigger` fixtures (and any event for a payment intent this app
// never created) carry no metadata naming a booking at all.
function eventWithNoBookingId(type, metadata = {}) {
  return { type, data: { object: { id: "pi_synthetic", metadata } } };
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

  it("schedules lighting for the confirmed booking's court and times", async () => {
    prisma.booking.findUnique.mockResolvedValue(pendingBooking());

    await handleStripeEvent(succeededEvent());

    expect(scheduleLighting).toHaveBeenCalledWith({
      courtId: 2,
      startTime: confirmedBooking.startTime,
      endTime: confirmedBooking.endTime,
    });
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

  it("does nothing when the booking no longer exists, and logs it", async () => {
    prisma.booking.findUnique.mockResolvedValue(null);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await handleStripeEvent(succeededEvent());

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it.each([{}, { bookingId: "not-a-number" }, { bookingId: "0" }])(
    "acknowledges without throwing, and logs it, when the metadata has no usable booking id: %j",
    async (metadata) => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      await expect(
        handleStripeEvent(eventWithNoBookingId("payment_intent.succeeded", metadata)),
      ).resolves.toBeUndefined();

      expect(prisma.booking.findUnique).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    },
  );

  it("acknowledges without throwing when the event object has no metadata field at all", async () => {
    const event = { type: "payment_intent.succeeded", data: { object: { id: "pi_synthetic" } } };
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(handleStripeEvent(event)).resolves.toBeUndefined();

    expect(prisma.$transaction).not.toHaveBeenCalled();
    consoleError.mockRestore();
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
    expect(scheduleLighting).not.toHaveBeenCalled();
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

  it("acknowledges without throwing when the metadata has no usable booking id", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      handleStripeEvent(eventWithNoBookingId("payment_intent.payment_failed")),
    ).resolves.toBeUndefined();

    expect(prisma.booking.findUnique).not.toHaveBeenCalled();
    expect(prisma.payment.update).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe("handleStripeEvent, any other event type", () => {
  it("is acknowledged without touching the database", async () => {
    await handleStripeEvent({ type: "charge.refunded", data: { object: {} } });

    expect(prisma.booking.findUnique).not.toHaveBeenCalled();
  });
});
