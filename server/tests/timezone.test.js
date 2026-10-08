import { describe, it, expect } from "vitest";
import { pragueTimeToUtc, formatPragueIso, pragueDateString } from "../src/timezone.js";

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

  // A hold expiry is "now plus ten minutes", so unlike a slot boundary it
  // almost never lands on a whole second.
  it("keeps the milliseconds and a whole-minute offset for an instant mid-second", () => {
    const instant = new Date("2026-07-15T05:00:18.473Z");
    expect(formatPragueIso(instant)).toBe("2026-07-15T07:00:18.473+02:00");
  });

  it("round trips an instant mid-second", () => {
    const instant = new Date("2026-01-15T06:30:07.009Z");
    expect(new Date(formatPragueIso(instant)).getTime()).toBe(instant.getTime());
  });
});

describe("pragueDateString", () => {
  it("matches the UTC date when they agree", () => {
    expect(pragueDateString(new Date("2026-07-15T12:00:00.000Z"))).toBe("2026-07-15");
  });

  it("is a day ahead of UTC late at night", () => {
    // 23:30 UTC on Jan 15 is 00:30 on Jan 16 in Prague (CET, UTC+1).
    expect(pragueDateString(new Date("2026-01-15T23:30:00.000Z"))).toBe("2026-01-16");
  });
});
