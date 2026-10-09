import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../src/db/client.js", () => ({
  prisma: {
    booking: { findMany: vi.fn() },
  },
}));

vi.mock("../src/hardware/index.js", () => ({
  openGate: vi.fn(),
}));

import { prisma } from "../src/db/client.js";
import { openGate } from "../src/hardware/index.js";
import { validateGateCode } from "../src/services/gateAccess.js";

// Fixed "now" so the window boundaries below are exact, not dependent on
// when the test happens to run. Start time 09:00, so with the config's
// margins the window is 08:40 to 09:45.
const now = new Date("2030-06-10T09:00:00.000Z");
const startTime = new Date("2030-06-10T09:00:00.000Z");

function confirmedBooking(overrides = {}) {
  return { id: 1, status: "confirmed", gateCode: "123456", startTime, ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("validateGateCode", () => {
  it("grants access and opens the gate for a code within its window", async () => {
    prisma.booking.findMany.mockResolvedValue([confirmedBooking()]);

    const result = await validateGateCode("123456");

    expect(result).toEqual({ granted: true });
    expect(openGate).toHaveBeenCalledWith({ bookingId: 1 });
  });

  it("denies a code that matches no confirmed booking", async () => {
    prisma.booking.findMany.mockResolvedValue([]);

    const result = await validateGateCode("999999");

    expect(result).toEqual({ granted: false });
    expect(openGate).not.toHaveBeenCalled();
  });

  it.each([
    ["exactly at the start of the window", "2030-06-10T08:40:00.000Z"],
    ["one minute into the window", "2030-06-10T08:41:00.000Z"],
    ["exactly at the start time", "2030-06-10T09:00:00.000Z"],
    ["exactly at the end of the window", "2030-06-10T09:45:00.000Z"],
  ])("grants access %s", async (_label, atIso) => {
    vi.setSystemTime(new Date(atIso));
    prisma.booking.findMany.mockResolvedValue([confirmedBooking()]);

    const result = await validateGateCode("123456");

    expect(result).toEqual({ granted: true });
  });

  it.each([
    ["one minute before the window opens", "2030-06-10T08:39:00.000Z"],
    ["one minute after the window closes", "2030-06-10T09:46:00.000Z"],
  ])("denies access %s", async (_label, atIso) => {
    vi.setSystemTime(new Date(atIso));
    prisma.booking.findMany.mockResolvedValue([confirmedBooking()]);

    const result = await validateGateCode("123456");

    expect(result).toEqual({ granted: false });
    expect(openGate).not.toHaveBeenCalled();
  });

  it("picks whichever of two bookings sharing a code is actually in its window", async () => {
    const outOfWindow = confirmedBooking({
      id: 1,
      startTime: new Date("2020-01-01T09:00:00.000Z"),
    });
    const inWindow = confirmedBooking({ id: 2, startTime });
    prisma.booking.findMany.mockResolvedValue([outOfWindow, inWindow]);

    const result = await validateGateCode("123456");

    expect(result).toEqual({ granted: true });
    expect(openGate).toHaveBeenCalledWith({ bookingId: 2 });
  });
});
