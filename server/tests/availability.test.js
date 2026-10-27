import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/db/client.js", () => ({
  prisma: {
    court: { findUnique: vi.fn() },
    booking: { findMany: vi.fn() },
    courtSlot: { findMany: vi.fn() },
    payment: { findUnique: vi.fn() },
  },
}));

vi.mock("../src/stripeClient.js", () => ({
  getStripe: vi.fn(),
}));

import { prisma } from "../src/db/client.js";
import { getAvailability, slotStartsForDay } from "../src/services/availability.js";

beforeEach(() => {
  vi.clearAllMocks();
  prisma.court.findUnique.mockResolvedValue({ id: 1, name: "Court 1", isActive: true });
  // expireStaleHolds's own lookup, run first inside getAvailability; no
  // stale holds in any test here unless one overrides this.
  prisma.booking.findMany.mockResolvedValue([]);
  prisma.courtSlot.findMany.mockResolvedValue([]);
  prisma.payment.findUnique.mockResolvedValue(null);
});

describe("slotStartsForDay", () => {
  it("returns 48 units for an ordinary 24 hour day, local midnight to local midnight", () => {
    // 2026-11-02 is a Monday, Prague winter time, CET (UTC+1), nowhere near
    // either daylight saving change.
    const starts = slotStartsForDay("2026-11-02");

    expect(starts).toHaveLength(48);
    expect(new Date(starts[0]).toISOString()).toBe("2026-11-01T23:00:00.000Z");
    expect(new Date(starts.at(-1)).toISOString()).toBe("2026-11-02T22:30:00.000Z");
  });

  it("returns 46 units on the day clocks spring forward, a 23 hour day", () => {
    // 2026-03-29: Prague clocks jump from 02:00 CET to 03:00 CEST at 01:00
    // UTC, so local midnight to local midnight is only 23 hours that day.
    const starts = slotStartsForDay("2026-03-29");

    expect(starts).toHaveLength(46);
    expect(new Date(starts[0]).toISOString()).toBe("2026-03-28T23:00:00.000Z");
    expect(new Date(starts.at(-1)).toISOString()).toBe("2026-03-29T21:30:00.000Z");
  });

  it("returns 50 units on the day clocks fall back, a 25 hour day", () => {
    // 2026-10-25: Prague clocks jump from 03:00 CEST back to 02:00 CET at
    // 01:00 UTC, so local midnight to local midnight is 25 hours that day.
    const starts = slotStartsForDay("2026-10-25");

    expect(starts).toHaveLength(50);
    expect(new Date(starts[0]).toISOString()).toBe("2026-10-24T22:00:00.000Z");
    expect(new Date(starts.at(-1)).toISOString()).toBe("2026-10-25T22:30:00.000Z");
  });
});

describe("getAvailability", () => {
  it("returns null when the court does not exist", async () => {
    prisma.court.findUnique.mockResolvedValue(null);

    const result = await getAvailability(99, "2026-09-20");

    expect(result).toBeNull();
    expect(prisma.courtSlot.findMany).not.toHaveBeenCalled();
  });

  it("returns null when the court is inactive, the same as if it did not exist", async () => {
    prisma.court.findUnique.mockResolvedValue({ id: 1, name: "Court 1", isActive: false });

    const result = await getAvailability(1, "2026-09-20");

    expect(result).toBeNull();
    expect(prisma.courtSlot.findMany).not.toHaveBeenCalled();
  });

  it("returns every unit of the day free, with nothing booked today or tomorrow to stop a run", async () => {
    // November 2 and 3 are both ordinary 48 unit days with nothing booked,
    // and there is no closing time to cap a run any more, so the free run
    // from today's first unit carries on into the whole of tomorrow too:
    // 48 of today's units plus 48 of tomorrow's.
    const slots = await getAvailability(1, "2026-11-02");

    expect(slots).toHaveLength(48);
    expect(slots[0]).toEqual({
      startTime: "2026-11-02T00:00:00.000+01:00",
      endTime: "2026-11-02T00:30:00.000+01:00",
      status: "free",
      maxUnits: 96,
    });
    // Today's last unit: only 1 of today's own units left, but 48 more
    // free ones immediately follow it at the start of tomorrow.
    expect(slots.at(-1)).toEqual({
      startTime: "2026-11-02T23:30:00.000+01:00",
      endTime: "2026-11-03T00:00:00.000+01:00",
      status: "free",
      maxUnits: 49,
    });
  });

  it("marks only the units a booking actually occupies as taken, and shortens the free run before it", async () => {
    // A booking from 09:00 to 10:00 Prague time (08:00 and 08:30 UTC)
    // occupies exactly two units.
    prisma.courtSlot.findMany.mockResolvedValue([
      { slotStart: new Date("2026-11-02T08:00:00.000Z") },
      { slotStart: new Date("2026-11-02T08:30:00.000Z") },
    ]);

    const slots = await getAvailability(1, "2026-11-02");

    const taken = slots.filter((slot) => slot.status === "taken");
    expect(taken.map((slot) => slot.startTime)).toEqual([
      "2026-11-02T09:00:00.000+01:00",
      "2026-11-02T09:30:00.000+01:00",
    ]);
    expect(taken[0]).not.toHaveProperty("maxUnits");

    // The free unit right before the taken pair has nowhere to run into,
    // only itself fits, where it would otherwise have had room for much
    // more of the day.
    const unitBefore = slots.find((slot) => slot.startTime === "2026-11-02T08:30:00.000+01:00");
    expect(unitBefore.maxUnits).toBe(1);
  });

  it("asks court_slots for this court across today and into tomorrow, as UTC instants, so a run can be seen to cross midnight", async () => {
    await getAvailability(1, "2026-09-20");

    expect(prisma.courtSlot.findMany).toHaveBeenCalledWith({
      where: {
        courtId: 1,
        slotStart: {
          gte: new Date("2026-09-19T22:00:00.000Z"),
          lt: new Date("2026-09-21T22:00:00.000Z"),
        },
      },
      select: { slotStart: true },
    });
  });

  it("sweeps stale holds before reading court_slots, so one that just expired is not read back as taken", async () => {
    await getAvailability(1, "2026-09-20");

    expect(prisma.booking.findMany).toHaveBeenCalledWith({
      where: { status: "pending", holdExpiresAt: { lt: expect.any(Date) } },
      select: { id: true },
    });
  });
});
