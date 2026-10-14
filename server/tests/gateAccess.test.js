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
// when the test happens to run. A one hour booking, 09:00 to 10:00, so with
// the config's margins the window is 08:40 to 10:15.
const now = new Date("2030-06-10T09:00:00.000Z");
const startTime = new Date("2030-06-10T09:00:00.000Z");
const endTime = new Date("2030-06-10T10:00:00.000Z");

function confirmedBooking(overrides = {}) {
  return { id: 1, status: "confirmed", gateCode: "123456", startTime, endTime, ...overrides };
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

  it("only ever queries for a confirmed booking with this code", async () => {
    prisma.booking.findMany.mockResolvedValue([]);

    await validateGateCode("123456");

    expect(prisma.booking.findMany).toHaveBeenCalledWith({
      where: { gateCode: "123456", status: "confirmed" },
    });
  });

  it("denies a code that matches no confirmed booking", async () => {
    prisma.booking.findMany.mockResolvedValue([]);

    const result = await validateGateCode("999999");

    expect(result).toEqual({ granted: false });
    expect(openGate).not.toHaveBeenCalled();
  });

  it("denies a cancelled booking's code even if it somehow still had one and was within its window", async () => {
    // The query above already excludes a cancelled booking, this is the
    // service's own second check, in case that query is ever loosened: a
    // cancelled booking's own confirmed-looking row must still be refused.
    prisma.booking.findMany.mockResolvedValue([confirmedBooking({ status: "cancelled" })]);

    const result = await validateGateCode("123456");

    expect(result).toEqual({ granted: false });
    expect(openGate).not.toHaveBeenCalled();
  });

  it("gives an unknown code and a cancelled booking's code the exact same response", async () => {
    prisma.booking.findMany.mockResolvedValue([]);
    const unknown = await validateGateCode("999999");

    prisma.booking.findMany.mockResolvedValue([confirmedBooking({ status: "cancelled" })]);
    const cancelled = await validateGateCode("123456");

    vi.setSystemTime(new Date("2030-06-10T08:39:00.000Z")); // one minute before the window
    prisma.booking.findMany.mockResolvedValue([confirmedBooking()]);
    const outsideWindow = await validateGateCode("123456");

    expect(unknown).toEqual({ granted: false });
    expect(cancelled).toEqual(unknown);
    expect(outsideWindow).toEqual(unknown);
  });

  it.each([
    ["exactly at the start of the window", "2030-06-10T08:40:00.000Z"],
    ["one minute into the window", "2030-06-10T08:41:00.000Z"],
    ["exactly at the start time", "2030-06-10T09:00:00.000Z"],
    [
      "exactly at the end of the window, 15 minutes after the booking ends",
      "2030-06-10T10:15:00.000Z",
    ],
  ])("grants access %s", async (_label, atIso) => {
    vi.setSystemTime(new Date(atIso));
    prisma.booking.findMany.mockResolvedValue([confirmedBooking()]);

    const result = await validateGateCode("123456");

    expect(result).toEqual({ granted: true });
  });

  it.each([
    ["one minute before the window opens", "2030-06-10T08:39:00.000Z"],
    ["one minute after the window closes", "2030-06-10T10:16:00.000Z"],
  ])("denies access %s", async (_label, atIso) => {
    vi.setSystemTime(new Date(atIso));
    prisma.booking.findMany.mockResolvedValue([confirmedBooking()]);

    const result = await validateGateCode("123456");

    expect(result).toEqual({ granted: false });
    expect(openGate).not.toHaveBeenCalled();
  });

  it("works 20 minutes before the start, and not 25 minutes before", async () => {
    prisma.booking.findMany.mockResolvedValue([confirmedBooking()]);

    vi.setSystemTime(new Date("2030-06-10T08:40:00.000Z")); // 20 minutes before 09:00
    expect(await validateGateCode("123456")).toEqual({ granted: true });

    vi.setSystemTime(new Date("2030-06-10T08:35:00.000Z")); // 25 minutes before 09:00
    expect(await validateGateCode("123456")).toEqual({ granted: false });
  });

  it("works 15 minutes after the end, and not 20 minutes after", async () => {
    prisma.booking.findMany.mockResolvedValue([confirmedBooking()]);

    vi.setSystemTime(new Date("2030-06-10T10:15:00.000Z")); // 15 minutes after 10:00
    expect(await validateGateCode("123456")).toEqual({ granted: true });

    vi.setSystemTime(new Date("2030-06-10T10:20:00.000Z")); // 20 minutes after 10:00
    expect(await validateGateCode("123456")).toEqual({ granted: false });
  });

  it("still works 90 minutes after the start of a two hour booking, past where the old fixed 45 minute rule would have cut it off", async () => {
    const twoHourBooking = confirmedBooking({ endTime: new Date("2030-06-10T11:00:00.000Z") });
    prisma.booking.findMany.mockResolvedValue([twoHourBooking]);

    vi.setSystemTime(new Date("2030-06-10T10:30:00.000Z")); // 90 minutes after 09:00

    expect(await validateGateCode("123456")).toEqual({ granted: true });
  });

  it("picks whichever of two bookings sharing a code is actually in its window", async () => {
    const outOfWindow = confirmedBooking({
      id: 1,
      startTime: new Date("2020-01-01T09:00:00.000Z"),
      endTime: new Date("2020-01-01T10:00:00.000Z"),
    });
    const inWindow = confirmedBooking({ id: 2, startTime, endTime });
    prisma.booking.findMany.mockResolvedValue([outOfWindow, inWindow]);

    const result = await validateGateCode("123456");

    expect(result).toEqual({ granted: true });
    expect(openGate).toHaveBeenCalledWith({ bookingId: 2 });
  });
});
