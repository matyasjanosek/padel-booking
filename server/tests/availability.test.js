import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/db/client.js", () => ({
  prisma: {
    court: { findUnique: vi.fn() },
    booking: { findMany: vi.fn(), updateMany: vi.fn() },
    payment: { findUnique: vi.fn() },
  },
}));

vi.mock("../src/stripeClient.js", () => ({
  getStripe: vi.fn(),
}));

import { prisma } from "../src/db/client.js";
import { getAvailability } from "../src/services/availability.js";

// expireStaleHolds runs first inside getAvailability and also calls
// booking.findMany (to find stale holds, a query with no courtId), before
// getAvailability's own lookup of that day's bookings (a query with
// courtId). Both share this one mock; find the one each test cares about
// by shape rather than by call order.
function availabilityQueryCall() {
  return prisma.booking.findMany.mock.calls.find(([{ where }]) => "courtId" in where);
}

beforeEach(() => {
  vi.clearAllMocks();
  prisma.court.findUnique.mockResolvedValue({ id: 1, name: "Court 1" });
  prisma.booking.findMany.mockResolvedValue([]);
  prisma.booking.updateMany.mockResolvedValue({ count: 0 });
  prisma.payment.findUnique.mockResolvedValue(null);
});

describe("getAvailability", () => {
  it("returns null when the court does not exist", async () => {
    prisma.court.findUnique.mockResolvedValue(null);

    const result = await getAvailability(99, "2026-09-20");

    expect(result).toBeNull();
    expect(prisma.booking.findMany).not.toHaveBeenCalled();
  });

  it("returns one slot per hour across the opening hours, in Prague summer time", async () => {
    // September 20 is still CEST, UTC+2.
    const slots = await getAvailability(1, "2026-09-20");

    expect(slots).toHaveLength(15); // 07:00 to 21:00
    expect(slots[0]).toEqual({
      startTime: "2026-09-20T07:00:00.000+02:00",
      endTime: "2026-09-20T08:00:00.000+02:00",
      status: "free",
    });
    expect(slots.at(-1)).toEqual({
      startTime: "2026-09-20T21:00:00.000+02:00",
      endTime: "2026-09-20T22:00:00.000+02:00",
      status: "free",
    });
    expect(slots.every((slot) => slot.status === "free")).toBe(true);
  });

  it("shows Prague winter time, UTC+1, for a date after the clocks change back", async () => {
    const slots = await getAvailability(1, "2026-11-02");

    expect(slots[0].startTime).toBe("2026-11-02T07:00:00.000+01:00");
    expect(slots.at(-1).endTime).toBe("2026-11-02T22:00:00.000+01:00");
  });

  it("marks a slot taken when a booking starts at that time", async () => {
    // 09:00 Prague summer time is 07:00 UTC. The expiry sweep's own
    // findMany call also resolves to this value by default; it is a
    // separate query (no courtId) so getAvailability never sees it.
    prisma.booking.findMany.mockImplementation(({ where }) =>
      Promise.resolve(
        "courtId" in where ? [{ startTime: new Date("2026-09-20T07:00:00.000Z") }] : [],
      ),
    );

    const slots = await getAvailability(1, "2026-09-20");

    const nineOClock = slots.find((slot) => slot.startTime === "2026-09-20T09:00:00.000+02:00");
    expect(nineOClock.status).toBe("taken");
    expect(slots.filter((slot) => slot.status === "taken")).toHaveLength(1);
  });

  it("asks the database only for confirmed bookings or pending bookings with an unexpired hold", async () => {
    await getAvailability(1, "2026-09-20");

    const { where } = availabilityQueryCall()[0];
    expect(where.courtId).toBe(1);
    expect(where.OR).toEqual([
      { status: "confirmed" },
      { status: "pending", holdExpiresAt: { gt: expect.any(Date) } },
    ]);
  });

  it("only looks at bookings within that day's Prague opening hours, as UTC instants", async () => {
    await getAvailability(1, "2026-09-20");

    const { where } = availabilityQueryCall()[0];
    // 07:00 and 22:00 Prague summer time.
    expect(where.startTime.gte.toISOString()).toBe("2026-09-20T05:00:00.000Z");
    expect(where.startTime.lt.toISOString()).toBe("2026-09-20T20:00:00.000Z");
  });

  it("sweeps stale holds before reading bookings, so a hold that just expired is not read back as taken", async () => {
    await getAvailability(1, "2026-09-20");

    expect(prisma.booking.findMany).toHaveBeenCalledWith({
      where: { status: "pending", holdExpiresAt: { lt: expect.any(Date) } },
      select: { id: true },
    });
  });
});
