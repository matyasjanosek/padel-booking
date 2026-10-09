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

import { prisma } from "../src/db/client.js";
import { generateGateCode } from "../src/services/gateCode.js";
import { handleStripeEvent } from "../src/services/stripeWebhook.js";

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
  prisma.$transaction.mockResolvedValue([]);
});

describe("handleStripeEvent, payment_intent.succeeded", () => {
  it("updates the booking and the payment together in one transaction", async () => {
    prisma.booking.findUnique.mockResolvedValue(pendingBooking());

    await handleStripeEvent(succeededEvent());

    expect(prisma.booking.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: "confirmed", gateCode: "123456" },
    });
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { bookingId: 1 },
      data: { status: "succeeded" },
    });
    expect(generateGateCode).toHaveBeenCalled();
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
