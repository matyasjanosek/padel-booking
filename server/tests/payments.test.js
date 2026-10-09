import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/db/client.js", () => ({
  prisma: {
    booking: { findUnique: vi.fn() },
    payment: { create: vi.fn(), findUniqueOrThrow: vi.fn(), delete: vi.fn() },
  },
}));

vi.mock("../src/stripeClient.js", () => ({
  getStripe: vi.fn(),
}));

function p2002() {
  return Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
}

import { prisma } from "../src/db/client.js";
import { getStripe } from "../src/stripeClient.js";
import { createPaymentIntentForBooking } from "../src/services/payments.js";

const booking = {
  id: 1,
  userId: 5,
  status: "pending",
  price: { toString: () => "400" },
  payment: null,
};

function fakeStripe() {
  return {
    paymentIntents: {
      create: vi.fn(),
      retrieve: vi.fn(),
      cancel: vi.fn(),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createPaymentIntentForBooking", () => {
  it("returns not_found for a booking that does not exist", async () => {
    prisma.booking.findUnique.mockResolvedValue(null);

    const result = await createPaymentIntentForBooking(1, 5);

    expect(result).toEqual({ outcome: "not_found" });
  });

  it("returns forbidden when the booking belongs to someone else", async () => {
    prisma.booking.findUnique.mockResolvedValue({ ...booking, userId: 99 });

    const result = await createPaymentIntentForBooking(1, 5);

    expect(result).toEqual({ outcome: "forbidden" });
  });

  it.each(["confirmed", "cancelled", "expired"])(
    "returns not_payable for a booking that is %s",
    async (status) => {
      prisma.booking.findUnique.mockResolvedValue({ ...booking, status });

      const result = await createPaymentIntentForBooking(1, 5);

      expect(result).toEqual({ outcome: "not_payable" });
    },
  );

  it("creates a payment intent in CZK, with the amount sent to Stripe in haléře but stored and returned in crowns", async () => {
    prisma.booking.findUnique.mockResolvedValue(booking);
    const stripe = fakeStripe();
    getStripe.mockReturnValue(stripe);
    stripe.paymentIntents.create.mockResolvedValue({
      id: "pi_1",
      client_secret: "pi_1_secret",
    });
    prisma.payment.create.mockResolvedValue({
      bookingId: 1,
      stripePaymentIntentId: "pi_1",
      amount: 400,
      currency: "czk",
    });

    const result = await createPaymentIntentForBooking(1, 5);

    // CZK is not a zero-decimal currency, Stripe's amount is in haléře.
    expect(stripe.paymentIntents.create).toHaveBeenCalledWith({
      amount: 40000,
      currency: "czk",
      metadata: { bookingId: "1" },
    });
    // What is stored and returned stays in crowns, matching booking.price.
    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: {
        bookingId: 1,
        stripePaymentIntentId: "pi_1",
        amount: 400,
        currency: "czk",
        status: "pending",
      },
    });
    expect(result).toEqual({
      outcome: "created",
      clientSecret: "pi_1_secret",
      amount: 400,
      currency: "czk",
    });
  });

  it.each(["requires_payment_method", "requires_confirmation", "requires_action"])(
    "reuses the existing payment intent instead of creating a second one, while it is still %s",
    async (status) => {
      prisma.booking.findUnique.mockResolvedValue({
        ...booking,
        payment: { stripePaymentIntentId: "pi_existing", amount: 400, currency: "czk" },
      });
      const stripe = fakeStripe();
      getStripe.mockReturnValue(stripe);
      stripe.paymentIntents.retrieve.mockResolvedValue({
        client_secret: "pi_existing_secret",
        status,
      });

      const result = await createPaymentIntentForBooking(1, 5);

      expect(stripe.paymentIntents.retrieve).toHaveBeenCalledWith("pi_existing");
      expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
      expect(result).toEqual({
        outcome: "created",
        clientSecret: "pi_existing_secret",
        amount: 400,
        currency: "czk",
      });
    },
  );

  it.each(["succeeded", "processing"])(
    "returns in_progress, not a second charge attempt, while the existing intent is %s",
    async (status) => {
      prisma.booking.findUnique.mockResolvedValue({
        ...booking,
        payment: { stripePaymentIntentId: "pi_existing", amount: 400, currency: "czk" },
      });
      const stripe = fakeStripe();
      getStripe.mockReturnValue(stripe);
      stripe.paymentIntents.retrieve.mockResolvedValue({
        client_secret: "pi_existing_secret",
        status,
      });

      const result = await createPaymentIntentForBooking(1, 5);

      expect(result).toEqual({ outcome: "in_progress" });
      expect(stripe.paymentIntents.cancel).not.toHaveBeenCalled();
    },
  );

  it("cancels a dead existing intent and creates a fresh one, rather than locking the booking out of paying", async () => {
    prisma.booking.findUnique.mockResolvedValue({
      ...booking,
      payment: { stripePaymentIntentId: "pi_dead", amount: 400, currency: "czk" },
    });
    const stripe = fakeStripe();
    getStripe.mockReturnValue(stripe);
    stripe.paymentIntents.retrieve.mockResolvedValue({ status: "canceled" });
    stripe.paymentIntents.cancel.mockResolvedValue({});
    prisma.payment.delete.mockResolvedValue({});
    stripe.paymentIntents.create.mockResolvedValue({
      id: "pi_fresh",
      client_secret: "pi_fresh_secret",
    });
    prisma.payment.create.mockResolvedValue({
      bookingId: 1,
      stripePaymentIntentId: "pi_fresh",
      amount: 400,
      currency: "czk",
    });

    const result = await createPaymentIntentForBooking(1, 5);

    expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith("pi_dead");
    expect(prisma.payment.delete).toHaveBeenCalledWith({ where: { bookingId: 1 } });
    expect(stripe.paymentIntents.create).toHaveBeenCalled();
    expect(result).toEqual({
      outcome: "created",
      clientSecret: "pi_fresh_secret",
      amount: 400,
      currency: "czk",
    });
  });

  it("cancels its own intent and uses the winner's when two requests race", async () => {
    prisma.booking.findUnique.mockResolvedValue(booking);
    const stripe = fakeStripe();
    getStripe.mockReturnValue(stripe);
    stripe.paymentIntents.create.mockResolvedValue({
      id: "pi_loser",
      client_secret: "loser_secret",
    });
    stripe.paymentIntents.cancel.mockResolvedValue({});
    prisma.payment.create.mockRejectedValue(p2002());
    prisma.payment.findUniqueOrThrow.mockResolvedValue({
      bookingId: 1,
      stripePaymentIntentId: "pi_winner",
      amount: 400,
      currency: "czk",
    });
    stripe.paymentIntents.retrieve.mockResolvedValue({ client_secret: "winner_secret" });

    const result = await createPaymentIntentForBooking(1, 5);

    expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith("pi_loser");
    expect(stripe.paymentIntents.retrieve).toHaveBeenCalledWith("pi_winner");
    expect(result.clientSecret).toBe("winner_secret");
  });
});
