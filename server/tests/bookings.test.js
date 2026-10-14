import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/db/client.js", () => ({
  prisma: {
    booking: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    courtSlot: { createMany: vi.fn(), deleteMany: vi.fn() },
    court: { findUnique: vi.fn() },
    coupon: { findUnique: vi.fn() },
    payment: { findUnique: vi.fn(), delete: vi.fn() },
    // Given its real implementation in beforeEach below, once the real
    // prisma import below exists to pass to it.
    $transaction: vi.fn(),
  },
}));

vi.mock("../src/stripeClient.js", () => ({
  getStripe: vi.fn(() => ({ paymentIntents: { cancel: vi.fn().mockResolvedValue({}) } })),
}));

vi.mock("../src/hardware/index.js", () => ({
  cancelLighting: vi.fn(),
}));

function p2002() {
  return Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
}

import { prisma } from "../src/db/client.js";
import { cancelLighting } from "../src/hardware/index.js";
import {
  createBooking,
  listBookingsForUser,
  cancelBooking,
  toPublicBooking,
} from "../src/services/bookings.js";

beforeEach(() => {
  vi.clearAllMocks();
  // $transaction's callback receives this same prisma mock, so every model
  // mock it calls (booking.create, courtSlot.createMany, ...) is the one
  // these tests already set up.
  prisma.$transaction.mockImplementation((callback) => callback(prisma));
  // No payment attached by default, releasePaymentIfPending's own cases are
  // covered in payments.test.js, cancelBooking's tests just need it to not
  // throw when it runs as part of cancelling.
  prisma.payment.findUnique.mockResolvedValue(null);
  // createBooking's tests mostly care about other things, an active court
  // is the sensible default so that check never gets in their way.
  prisma.court.findUnique.mockResolvedValue({ id: 2, name: "Court 2", isActive: true });
  // A real create echoes back every column it was given, plus the id. Most
  // tests below only care about what create was called with, not what it
  // returns, so this default is enough; a few override it to check what
  // courtSlotRowsFor does with the row it gets back.
  prisma.booking.create.mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data }));
  prisma.courtSlot.createMany.mockResolvedValue({ count: 0 });
});

describe("createBooking", () => {
  it("creates a pending booking with the chosen duration, a price and a hold expiry a few minutes ahead", async () => {
    const startTime = new Date("2030-06-10T07:00:00.000Z");

    const before = Date.now();
    await createBooking({ userId: 5, courtId: 2, startTime, durationMinutes: 90 });
    const after = Date.now();

    const { data } = prisma.booking.create.mock.calls[0][0];
    expect(data.userId).toBe(5);
    expect(data.courtId).toBe(2);
    expect(data.status).toBe("pending");
    expect(data.startTime).toBe(startTime);
    expect(data.endTime.toISOString()).toBe("2030-06-10T08:30:00.000Z");
    expect(data.price).toBe(600);
    expect(data.couponId).toBeNull();

    // The service reads the clock at some instant between before and after,
    // so the hold lands in exactly that window shifted by the hold length.
    // Bounding both ends against the real readings makes this deterministic
    // rather than dependent on how long the call took.
    const tenMinutes = 10 * 60 * 1000;
    expect(data.holdExpiresAt.getTime()).toBeGreaterThanOrEqual(before + tenMinutes);
    expect(data.holdExpiresAt.getTime()).toBeLessThanOrEqual(after + tenMinutes);
  });

  it("inserts one court_slot row per 30 minute unit the duration covers", async () => {
    const startTime = new Date("2030-06-10T07:00:00.000Z");

    await createBooking({ userId: 5, courtId: 2, startTime, durationMinutes: 90 });

    const { data: rows } = prisma.courtSlot.createMany.mock.calls[0][0];
    expect(rows).toEqual([
      { courtId: 2, slotStart: new Date("2030-06-10T07:00:00.000Z"), bookingId: 1 },
      { courtId: 2, slotStart: new Date("2030-06-10T07:30:00.000Z"), bookingId: 1 },
      { courtId: 2, slotStart: new Date("2030-06-10T08:00:00.000Z"), bookingId: 1 },
    ]);
  });

  it("propagates a conflict with an overlapping booking without creating any row", async () => {
    prisma.courtSlot.createMany.mockRejectedValue(p2002());

    await expect(
      createBooking({
        userId: 5,
        courtId: 2,
        startTime: new Date("2030-06-10T07:00:00.000Z"),
        durationMinutes: 60,
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("propagates a non-conflict error, for example a court that does not exist, before touching bookings", async () => {
    const foreignKeyError = Object.assign(new Error("Foreign key constraint failed"), {
      code: "P2003",
    });
    prisma.booking.create.mockRejectedValue(foreignKeyError);

    await expect(
      createBooking({
        userId: 5,
        courtId: 999,
        startTime: new Date("2030-06-10T07:00:00.000Z"),
        durationMinutes: 60,
      }),
    ).rejects.toBe(foreignKeyError);
  });

  it("rejects with a court not found style error when the court does not exist, before touching bookings", async () => {
    prisma.court.findUnique.mockResolvedValue(null);

    await expect(
      createBooking({
        userId: 5,
        courtId: 999,
        startTime: new Date("2030-06-10T07:00:00.000Z"),
        durationMinutes: 60,
      }),
    ).rejects.toMatchObject({ code: "P2003" });

    expect(prisma.booking.create).not.toHaveBeenCalled();
  });

  it("rejects the same way when the court exists but is inactive", async () => {
    prisma.court.findUnique.mockResolvedValue({ id: 2, name: "Court 2", isActive: false });

    await expect(
      createBooking({
        userId: 5,
        courtId: 2,
        startTime: new Date("2030-06-10T07:00:00.000Z"),
        durationMinutes: 60,
      }),
    ).rejects.toMatchObject({ code: "P2003" });

    expect(prisma.booking.create).not.toHaveBeenCalled();
  });

  it("applies a valid coupon code, discounting the duration's price and storing the coupon id", async () => {
    const now = new Date();
    prisma.coupon.findUnique.mockResolvedValue({
      id: 9,
      code: "SUMMER10",
      discountType: "percentage",
      discountValue: 10,
      isActive: true,
      validFrom: new Date(now.getTime() - 1000),
      validUntil: new Date(now.getTime() + 1000),
      maxUses: 5,
      timesUsed: 0,
    });

    await createBooking({
      userId: 5,
      courtId: 2,
      startTime: new Date("2030-06-10T07:00:00.000Z"),
      durationMinutes: 60,
      couponCode: "summer10",
    });

    expect(prisma.coupon.findUnique).toHaveBeenCalledWith({ where: { code: "SUMMER10" } });
    const { data } = prisma.booking.create.mock.calls[0][0];
    expect(data.price).toBe(360);
    expect(data.couponId).toBe(9);
  });

  it("rejects an unknown coupon code without creating a booking", async () => {
    prisma.coupon.findUnique.mockResolvedValue(null);

    await expect(
      createBooking({
        userId: 5,
        courtId: 2,
        startTime: new Date("2030-06-10T07:00:00.000Z"),
        durationMinutes: 60,
        couponCode: "NOPE",
      }),
    ).rejects.toMatchObject({ code: "COUPON_ERROR", message: "This coupon code does not exist." });

    expect(prisma.booking.create).not.toHaveBeenCalled();
  });

  it("rejects an expired coupon code with a clear message", async () => {
    const past = new Date(Date.now() - 1000);
    prisma.coupon.findUnique.mockResolvedValue({
      id: 9,
      code: "OLD",
      discountType: "fixed",
      discountValue: 50,
      isActive: true,
      validFrom: new Date(past.getTime() - 1000),
      validUntil: past,
      maxUses: 5,
      timesUsed: 0,
    });

    await expect(
      createBooking({
        userId: 5,
        courtId: 2,
        startTime: new Date("2030-06-10T07:00:00.000Z"),
        durationMinutes: 60,
        couponCode: "OLD",
      }),
    ).rejects.toMatchObject({ code: "COUPON_ERROR", message: "This coupon has expired." });

    expect(prisma.booking.create).not.toHaveBeenCalled();
  });

  it("does not look up a coupon at all when no code is given", async () => {
    await createBooking({
      userId: 5,
      courtId: 2,
      startTime: new Date("2030-06-10T07:00:00.000Z"),
      durationMinutes: 60,
    });

    expect(prisma.coupon.findUnique).not.toHaveBeenCalled();
  });

  it.each([
    [60, 400],
    [90, 600],
    [120, 800],
    [150, 1000],
    [180, 1200],
  ])("prices a %i minute booking at %i CZK", async (durationMinutes, expectedPrice) => {
    await createBooking({
      userId: 5,
      courtId: 2,
      startTime: new Date("2030-06-10T07:00:00.000Z"),
      durationMinutes,
    });

    expect(prisma.booking.create.mock.calls[0][0].data.price).toBe(expectedPrice);
  });
});

describe("listBookingsForUser", () => {
  it("asks for only this user's bookings, newest start time first", async () => {
    prisma.booking.findMany.mockResolvedValue([]);

    await listBookingsForUser(5);

    expect(prisma.booking.findMany).toHaveBeenCalledWith({
      where: { userId: 5 },
      orderBy: { startTime: "desc" },
      include: { coupon: true },
    });
  });
});

describe("cancelBooking", () => {
  const booking = {
    id: 1,
    userId: 5,
    courtId: 2,
    startTime: new Date("2030-06-10T07:00:00.000Z"),
    status: "pending",
  };

  it("returns not_found for a booking that does not exist", async () => {
    prisma.booking.findUnique.mockResolvedValue(null);

    const result = await cancelBooking(1, 5);

    expect(result).toEqual({ outcome: "not_found" });
    expect(prisma.booking.update).not.toHaveBeenCalled();
  });

  it("returns forbidden when the booking belongs to someone else", async () => {
    prisma.booking.findUnique.mockResolvedValue({ ...booking, userId: 99 });

    const result = await cancelBooking(1, 5);

    expect(result).toEqual({ outcome: "forbidden" });
    expect(prisma.booking.update).not.toHaveBeenCalled();
  });

  it.each(["expired", "cancelled"])(
    "returns not_cancellable for a booking that is already %s",
    async (status) => {
      prisma.booking.findUnique.mockResolvedValue({ ...booking, status });

      const result = await cancelBooking(1, 5);

      expect(result).toEqual({ outcome: "not_cancellable" });
      expect(prisma.booking.update).not.toHaveBeenCalled();
    },
  );

  it.each(["pending", "confirmed"])("cancels the owner's own %s booking", async (status) => {
    prisma.booking.findUnique.mockResolvedValue({ ...booking, status });
    const cancelled = { ...booking, status: "cancelled" };
    prisma.booking.update.mockResolvedValue(cancelled);

    const result = await cancelBooking(1, 5);

    expect(result).toEqual({ outcome: "cancelled", booking: cancelled });
    expect(prisma.booking.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: "cancelled", gateCode: null },
    });
  });

  it("frees every court_slot row for the booking, in the same transaction as the status change", async () => {
    prisma.booking.findUnique.mockResolvedValue(booking);
    prisma.booking.update.mockResolvedValue({ ...booking, status: "cancelled" });

    await cancelBooking(1, 5);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.courtSlot.deleteMany).toHaveBeenCalledWith({ where: { bookingId: 1 } });
  });

  it("releases a still pending payment when cancelling", async () => {
    prisma.booking.findUnique.mockResolvedValue(booking);
    prisma.booking.update.mockResolvedValue({ ...booking, status: "cancelled" });
    prisma.payment.findUnique.mockResolvedValue({
      bookingId: 1,
      stripePaymentIntentId: "pi_1",
      status: "pending",
    });

    await cancelBooking(1, 5);

    expect(prisma.payment.delete).toHaveBeenCalledWith({ where: { bookingId: 1 } });
  });

  it("cancels the lighting schedule when cancelling a confirmed booking", async () => {
    prisma.booking.findUnique.mockResolvedValue({ ...booking, status: "confirmed" });
    prisma.booking.update.mockResolvedValue({ ...booking, status: "cancelled" });

    await cancelBooking(1, 5);

    expect(cancelLighting).toHaveBeenCalledWith({ courtId: 2, startTime: booking.startTime });
  });

  it("does not touch lighting when cancelling a pending booking, nothing was ever scheduled", async () => {
    prisma.booking.findUnique.mockResolvedValue(booking);
    prisma.booking.update.mockResolvedValue({ ...booking, status: "cancelled" });

    await cancelBooking(1, 5);

    expect(cancelLighting).not.toHaveBeenCalled();
  });
});

describe("toPublicBooking", () => {
  it("shows times in Prague and the price as a number", () => {
    const booking = {
      id: 1,
      courtId: 2,
      startTime: new Date("2030-06-10T05:00:00.000Z"),
      endTime: new Date("2030-06-10T06:00:00.000Z"),
      status: "pending",
      // Prisma hands back a Decimal here, not a plain number, and it
      // serialises to a string unless it is converted.
      price: { toString: () => "400" },
      holdExpiresAt: new Date("2030-06-10T05:10:00.000Z"),
    };

    expect(toPublicBooking(booking)).toEqual({
      id: 1,
      courtId: 2,
      startTime: "2030-06-10T07:00:00.000+02:00",
      endTime: "2030-06-10T08:00:00.000+02:00",
      status: "pending",
      price: 400,
      couponCode: null,
      gateCode: null,
      gateCodeValidFrom: null,
      gateCodeValidUntil: null,
      holdExpiresAt: "2030-06-10T07:10:00.000+02:00",
    });
  });

  it("shows a longer booking's real end time, not one hour after its start", () => {
    const booking = {
      id: 1,
      courtId: 2,
      startTime: new Date("2030-06-10T05:00:00.000Z"),
      endTime: new Date("2030-06-10T07:30:00.000Z"),
      status: "pending",
      price: 1000,
      holdExpiresAt: null,
    };

    expect(toPublicBooking(booking).endTime).toBe("2030-06-10T09:30:00.000+02:00");
  });

  it("shows the coupon code when the booking's coupon was included in the query", () => {
    const booking = {
      id: 1,
      courtId: 2,
      startTime: new Date("2030-06-10T05:00:00.000Z"),
      endTime: new Date("2030-06-10T06:00:00.000Z"),
      status: "pending",
      price: 360,
      coupon: { code: "SUMMER10" },
      holdExpiresAt: null,
    };

    expect(toPublicBooking(booking).couponCode).toBe("SUMMER10");
  });

  it("shows the gate code and its validity window for a confirmed booking", () => {
    const booking = {
      id: 1,
      courtId: 2,
      // 16:00Z is 18:00 Prague summer time.
      startTime: new Date("2030-06-10T16:00:00.000Z"),
      endTime: new Date("2030-06-10T17:00:00.000Z"),
      status: "confirmed",
      price: 400,
      gateCode: "123456",
      holdExpiresAt: null,
    };

    const result = toPublicBooking(booking);
    expect(result.gateCode).toBe("123456");
    // 20 minutes before the 18:00 start, 15 minutes after the 19:00 end.
    expect(result.gateCodeValidFrom).toBe("2030-06-10T17:40:00.000+02:00");
    expect(result.gateCodeValidUntil).toBe("2030-06-10T19:15:00.000+02:00");
  });

  it("extends the validity window with a longer booking, instead of cutting it off mid booking", () => {
    const booking = {
      id: 1,
      courtId: 2,
      // A two hour booking, 18:00 to 20:00 Prague summer time.
      startTime: new Date("2030-06-10T16:00:00.000Z"),
      endTime: new Date("2030-06-10T18:00:00.000Z"),
      status: "confirmed",
      price: 800,
      gateCode: "123456",
      holdExpiresAt: null,
    };

    const result = toPublicBooking(booking);
    // 15 minutes after the 20:00 end, not 45 minutes after the 18:00 start.
    expect(result.gateCodeValidUntil).toBe("2030-06-10T20:15:00.000+02:00");
  });

  it.each(["pending", "cancelled", "expired"])(
    "never shows the gate code or its window for a %s booking",
    (status) => {
      const booking = {
        id: 1,
        courtId: 2,
        startTime: new Date("2030-06-10T16:00:00.000Z"),
        endTime: new Date("2030-06-10T17:00:00.000Z"),
        status,
        price: 400,
        // Set as if the booking had been confirmed and then cancelled,
        // the exact case toPublicBooking has to guard against.
        gateCode: "123456",
        holdExpiresAt: null,
      };

      const result = toPublicBooking(booking);
      expect(result.gateCode).toBeNull();
      expect(result.gateCodeValidFrom).toBeNull();
      expect(result.gateCodeValidUntil).toBeNull();
    },
  );

  it("shows a null hold expiry as null", () => {
    const booking = {
      id: 1,
      courtId: 2,
      startTime: new Date("2030-06-10T05:00:00.000Z"),
      endTime: new Date("2030-06-10T06:00:00.000Z"),
      status: "confirmed",
      price: 400,
      holdExpiresAt: null,
    };

    expect(toPublicBooking(booking).holdExpiresAt).toBeNull();
  });
});
