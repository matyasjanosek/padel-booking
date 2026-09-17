import { describe, it, expect } from "vitest";
import { pragueTimeToUtc, formatPragueIso } from "../src/timezone.js";

describe("pragueTimeToUtc", () => {
  it("uses CET, UTC+1, in winter", () => {
    const utc = pragueTimeToUtc(2026, 1, 15, 7, 0);
    expect(utc.toISOString()).toBe("2026-01-15T06:00:00.000Z");
  });

  it("uses CEST, UTC+2, in summer", () => {
    const utc = pragueTimeToUtc(2026, 7, 15, 7, 0);
    expect(utc.toISOString()).toBe("2026-07-15T05:00:00.000Z");
  });

  it("is correct on the day clocks spring forward", () => {
    // Clocks jump from 02:00 to 03:00 CEST on the last Sunday of March.
    const utc = pragueTimeToUtc(2026, 3, 29, 7, 0);
    expect(utc.toISOString()).toBe("2026-03-29T05:00:00.000Z");
  });

  it("is correct on the day clocks fall back", () => {
    // Clocks jump from 03:00 CEST back to 02:00 CET on the last Sunday of October.
    const utc = pragueTimeToUtc(2026, 10, 25, 22, 0);
    expect(utc.toISOString()).toBe("2026-10-25T21:00:00.000Z");
  });
});

describe("formatPragueIso", () => {
  it("shows +01:00 in winter", () => {
    const instant = new Date("2026-01-15T06:00:00.000Z");
    expect(formatPragueIso(instant)).toBe("2026-01-15T07:00:00.000+01:00");
  });

  it("shows +02:00 in summer", () => {
    const instant = new Date("2026-07-15T05:00:00.000Z");
    expect(formatPragueIso(instant)).toBe("2026-07-15T07:00:00.000+02:00");
  });

  it("round trips back to the same instant", () => {
    const instant = new Date("2026-10-25T21:00:00.000Z");
    expect(new Date(formatPragueIso(instant)).getTime()).toBe(instant.getTime());
  });
});
