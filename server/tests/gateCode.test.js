import { describe, it, expect } from "vitest";
import { generateGateCode, gateCodeWindow } from "../src/services/gateCode.js";
import { formatPragueIso } from "../src/timezone.js";

describe("generateGateCode", () => {
  it("returns a 6 digit numeric string", () => {
    const code = generateGateCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it("is not the same every time", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateGateCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe("gateCodeWindow", () => {
  it("is 20 minutes before the start and 15 minutes after the end, not a fixed offset from the start", () => {
    // A two hour booking, 16:00 to 18:00. The old rule, 20 before and 45
    // after the start, was only ever right because every booking used to
    // be exactly one hour; here it would cut the code off at 16:45, well
    // before this booking even ends.
    const startTime = new Date("2030-06-10T16:00:00.000Z");
    const endTime = new Date("2030-06-10T18:00:00.000Z");
    const { validFrom, validUntil } = gateCodeWindow(startTime, endTime);

    expect(validFrom.toISOString()).toBe("2030-06-10T15:40:00.000Z");
    expect(validUntil.toISOString()).toBe("2030-06-10T18:15:00.000Z");
  });

  // gateCodeWindow itself is plain millisecond arithmetic on UTC instants,
  // not timezone aware, so it cannot break on its own across a DST change.
  // What can break is showing that window to a player in Prague time, which
  // is what toPublicBooking actually does with these two instants. These
  // confirm that combination stays correct even when the window straddles
  // the exact moment clocks change, not just on an ordinary day.
  it("formats correctly in Prague time when the window straddles clocks springing forward", () => {
    // Clocks jump from 02:00 CET to 03:00 CEST at 01:00 UTC. A 90 minute
    // booking starting right at that moment.
    const startTime = new Date("2026-03-29T01:00:00.000Z");
    const endTime = new Date("2026-03-29T02:30:00.000Z");
    const { validFrom, validUntil } = gateCodeWindow(startTime, endTime);

    expect(formatPragueIso(validFrom)).toBe("2026-03-29T01:40:00.000+01:00");
    expect(formatPragueIso(validUntil)).toBe("2026-03-29T04:45:00.000+02:00");
  });

  it("formats correctly in Prague time when the window straddles clocks falling back", () => {
    // Clocks jump from 03:00 CEST back to 02:00 CET at 01:00 UTC. A 90
    // minute booking starting right at that moment.
    const startTime = new Date("2026-10-25T01:00:00.000Z");
    const endTime = new Date("2026-10-25T02:30:00.000Z");
    const { validFrom, validUntil } = gateCodeWindow(startTime, endTime);

    expect(formatPragueIso(validFrom)).toBe("2026-10-25T02:40:00.000+02:00");
    expect(formatPragueIso(validUntil)).toBe("2026-10-25T03:45:00.000+01:00");
  });
});
