import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/db/client.js", () => ({
  prisma: {
    booking: { create: vi.fn() },
  },
}));

import { prisma } from "../src/db/client.js";
import { createBooking, toPublicBooking } from "../src/services/bookings.js";

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
