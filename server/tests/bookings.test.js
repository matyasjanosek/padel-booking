import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/db/client.js", () => ({
  prisma: {
    booking: {
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

function p2002() {
  return Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
}

import { prisma } from "../src/db/client.js";
import {
  createBooking,
  listBookingsForUser,
  cancelBooking,
  toPublicBooking,
} from "../src/services/bookings.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createBooking", () => {
  it("creates a pending booking with an hour-long slot, a price and a hold expiry a few minutes ahead", async () => {
    const startTime = new Date("2030-06-10T07:00:00.000Z");
    prisma.booking.create.mockResolvedValue({ id: 1 });

    const before = Date.now();
    await createBooking({ userId: 5, courtId: 2, startTime });
    const after = Date.now();

    const { data } = prisma.booking.create.mock.calls[0][0];
    expect(data.userId).toBe(5);
    expect(data.courtId).toBe(2);
    expect(data.status).toBe("pending");
    expect(data.startTime).toBe(startTime);
    expect(data.endTime.toISOString()).toBe("2030-06-10T08:00:00.000Z");
    expect(data.price).toBe(400);

    // The service reads the clock at some instant between before and after,
    // so the hold lands in exactly that window shifted by the hold length.
    // Bounding both ends against the real readings makes this deterministic
    // rather than dependent on how long the call took.
    const tenMinutes = 10 * 60 * 1000;
    expect(data.holdExpiresAt.getTime()).toBeGreaterThanOrEqual(before + tenMinutes);
    expect(data.holdExpiresAt.getTime()).toBeLessThanOrEqual(after + tenMinutes);
  });

  it("propagates a conflict with a genuinely taken slot without touching updateMany", async () => {
    // A brand new slot where two requests raced: this call's insert loses,
    // and the row that won is an active booking, not a stale one.
    prisma.booking.create.mockRejectedValue(p2002());
    prisma.booking.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      createBooking({ userId: 5, courtId: 2, startTime: new Date("2030-06-10T07:00:00.000Z") }),
    ).rejects.toMatchObject({ code: "P2002" });

    expect(prisma.booking.updateMany).toHaveBeenCalled();
  });

  it("reclaims a stale row in place when the insert conflicts with it", async () => {
    const startTime = new Date("2030-06-10T07:00:00.000Z");
    prisma.booking.create.mockRejectedValue(p2002());
    prisma.booking.updateMany.mockResolvedValue({ count: 1 });
    const reclaimedRow = { id: 7, courtId: 2, startTime, status: "pending" };
    prisma.booking.findUniqueOrThrow.mockResolvedValue(reclaimedRow);

    const result = await createBooking({ userId: 5, courtId: 2, startTime });

    expect(result).toBe(reclaimedRow);
    const { where, data } = prisma.booking.updateMany.mock.calls[0][0];
    expect(where.courtId).toBe(2);
    expect(where.startTime).toBe(startTime);
    expect(where.OR).toEqual([
      { status: "cancelled" },
      { status: "expired" },
      { status: "pending", holdExpiresAt: { lt: expect.any(Date) } },
    ]);
    expect(data.userId).toBe(5);
    expect(data.status).toBe("pending");
  });

  it("does not reclaim a row that is pending with an unexpired hold", async () => {
    // This is what makes the update safe to race: a second request chasing
    // the same stale row sees its own guard fail once the first has won.
    prisma.booking.create.mockRejectedValue(p2002());
    prisma.booking.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      createBooking({ userId: 5, courtId: 2, startTime: new Date("2030-06-10T07:00:00.000Z") }),
    ).rejects.toMatchObject({ code: "P2002" });

    expect(prisma.booking.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("propagates a non-conflict error, for example a court that does not exist, without reclaiming anything", async () => {
    const foreignKeyError = Object.assign(new Error("Foreign key constraint failed"), {
      code: "P2003",
    });
    prisma.booking.create.mockRejectedValue(foreignKeyError);

    await expect(
      createBooking({ userId: 5, courtId: 999, startTime: new Date("2030-06-10T07:00:00.000Z") }),
    ).rejects.toBe(foreignKeyError);

    expect(prisma.booking.updateMany).not.toHaveBeenCalled();
  });
});

describe("listBookingsForUser", () => {
  it("asks for only this user's bookings, newest start time first", async () => {
    prisma.booking.findMany.mockResolvedValue([]);

    await listBookingsForUser(5);

    expect(prisma.booking.findMany).toHaveBeenCalledWith({
      where: { userId: 5 },
      orderBy: { startTime: "desc" },
    });
  });
});

describe("cancelBooking", () => {
  const booking = { id: 1, userId: 5, status: "pending" };

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
      data: { status: "cancelled" },
    });
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
      holdExpiresAt: "2030-06-10T07:10:00.000+02:00",
    });
  });

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
