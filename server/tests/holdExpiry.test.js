import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/db/client.js", () => ({
  prisma: {
    booking: { findMany: vi.fn(), updateMany: vi.fn() },
    payment: { findUnique: vi.fn(), delete: vi.fn() },
  },
}));

vi.mock("../src/stripeClient.js", () => ({
  getStripe: vi.fn(),
}));

import { prisma } from "../src/db/client.js";
import { getStripe } from "../src/stripeClient.js";
import { expireStaleHolds } from "../src/services/holdExpiry.js";

function fakeStripe() {
  return { paymentIntents: { cancel: vi.fn().mockResolvedValue({}) } };
}

beforeEach(() => {
  vi.clearAllMocks();
  prisma.booking.findMany.mockResolvedValue([]);
  prisma.payment.findUnique.mockResolvedValue(null);
  getStripe.mockReturnValue(fakeStripe());
});

describe("expireStaleHolds", () => {
  it("does nothing when there are no stale holds", async () => {
    const count = await expireStaleHolds();

    expect(count).toBe(0);
    expect(prisma.booking.updateMany).not.toHaveBeenCalled();
  });

  it("flips every stale pending booking to expired and returns how many", async () => {
    prisma.booking.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    const count = await expireStaleHolds();

    expect(count).toBe(2);
    expect(prisma.booking.findMany).toHaveBeenCalledWith({
      where: { status: "pending", holdExpiresAt: { lt: expect.any(Date) } },
      select: { id: true },
    });
    expect(prisma.booking.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [1, 2] } },
      data: { status: "expired" },
    });
  });

  it("releases a still pending payment for each booking it expires", async () => {
    prisma.booking.findMany.mockResolvedValue([{ id: 1 }]);
    prisma.payment.findUnique.mockResolvedValue({
      bookingId: 1,
      stripePaymentIntentId: "pi_1",
      status: "pending",
    });
    const stripe = fakeStripe();
    getStripe.mockReturnValue(stripe);

    await expireStaleHolds();

    expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith("pi_1");
    expect(prisma.payment.delete).toHaveBeenCalledWith({ where: { bookingId: 1 } });
  });

  it("does not touch a payment that already succeeded or failed", async () => {
    prisma.booking.findMany.mockResolvedValue([{ id: 1 }]);
    prisma.payment.findUnique.mockResolvedValue({
      bookingId: 1,
      stripePaymentIntentId: "pi_1",
      status: "succeeded",
    });

    await expireStaleHolds();

    expect(prisma.payment.delete).not.toHaveBeenCalled();
  });
});
