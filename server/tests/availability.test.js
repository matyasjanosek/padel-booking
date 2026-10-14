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
import {
  getAvailability,
  slotStartsForDay,
  closingInstantFor,
} from "../src/services/availability.js";

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
  it("returns 30 units on a weekday, 07:00 to 22:00", () => {
    // 2026-11-02 is a Monday, already in Prague winter time, CET (UTC+1).
    const starts = slotStartsForDay("2026-11-02");

    expect(starts).toHaveLength(30);
    expect(new Date(starts[0]).toISOString()).toBe("2026-11-02T06:00:00.000Z");
    expect(new Date(starts.at(-1)).toISOString()).toBe("2026-11-02T20:30:00.000Z");
  });

  it("returns 26 units at the weekend, 07:00 to 20:00, closing two hours earlier than a weekday", () => {
    // 2026-09-20 is a Sunday, Prague summer time, CEST (UTC+2).
    const starts = slotStartsForDay("2026-09-20");

    expect(starts).toHaveLength(26);
    expect(new Date(starts[0]).toISOString()).toBe("2026-09-20T05:00:00.000Z");
    expect(new Date(starts.at(-1)).toISOString()).toBe("2026-09-20T17:30:00.000Z");
  });

  it("still produces 26 weekend units across the day clocks spring forward", () => {
    // 2026-03-29: clocks jump from 02:00 CET to 03:00 CEST at 01:00 UTC,
    // well before the 07:00 opening, so the whole day uses CEST (UTC+2).
    // Also a Sunday, so the weekend closing hour applies too.
    const starts = slotStartsForDay("2026-03-29");

    expect(starts).toHaveLength(26);
    expect(new Date(starts[0]).toISOString()).toBe("2026-03-29T05:00:00.000Z");
    expect(new Date(starts.at(-1)).toISOString()).toBe("2026-03-29T17:30:00.000Z");
  });

  it("still produces 26 weekend units across the day clocks fall back", () => {
    // 2026-10-25: clocks jump from 03:00 CEST back to 02:00 CET at 01:00
    // UTC, well before the 07:00 opening, so the whole day uses CET
    // (UTC+1). Also a Sunday.
    const starts = slotStartsForDay("2026-10-25");

    expect(starts).toHaveLength(26);
    expect(new Date(starts[0]).toISOString()).toBe("2026-10-25T06:00:00.000Z");
    expect(new Date(starts.at(-1)).toISOString()).toBe("2026-10-25T18:30:00.000Z");
  });
});

describe("closingInstantFor", () => {
  it("is 22:00 Prague time on a weekday", () => {
    const instant = closingInstantFor(new Date("2026-11-02T10:00:00.000Z"));
    expect(instant.toISOString()).toBe("2026-11-02T21:00:00.000Z");
  });

  it("is 20:00 Prague time at the weekend", () => {
    const instant = closingInstantFor(new Date("2026-09-20T10:00:00.000Z"));
    expect(instant.toISOString()).toBe("2026-09-20T18:00:00.000Z");
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

  it("returns every unit free, with the longest duration that fits each, on a weekday with nothing booked", async () => {
    // November 2 is a Monday, winter time, CET (UTC+1), closing 22:00.
    const slots = await getAvailability(1, "2026-11-02");

    expect(slots).toHaveLength(30);
    expect(slots[0]).toEqual({
      startTime: "2026-11-02T07:00:00.000+01:00",
      endTime: "2026-11-02T07:30:00.000+01:00",
      status: "free",
      maxUnits: 30,
    });
    expect(slots.at(-1)).toEqual({
      startTime: "2026-11-02T21:30:00.000+01:00",
      endTime: "2026-11-02T22:00:00.000+01:00",
      status: "free",
      maxUnits: 1,
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

  it("asks court_slots only for this court within that day's opening hours, as UTC instants", async () => {
    await getAvailability(1, "2026-09-20");

    expect(prisma.courtSlot.findMany).toHaveBeenCalledWith({
      where: {
        courtId: 1,
        slotStart: {
          gte: new Date("2026-09-20T05:00:00.000Z"),
          lt: new Date("2026-09-20T18:00:00.000Z"),
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
