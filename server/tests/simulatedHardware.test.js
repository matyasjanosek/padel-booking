import { describe, it, expect } from "vitest";
import {
  scheduleLighting,
  openGate,
  getLightingSchedules,
  getGateEvents,
} from "../src/hardware/simulatedHardware.js";

describe("simulatedHardware", () => {
  it("stores and returns a lighting schedule for a court and time window", () => {
    const startTime = new Date("2030-06-10T07:00:00.000Z");
    const endTime = new Date("2030-06-10T08:00:00.000Z");

    const schedule = scheduleLighting({ courtId: 1, startTime, endTime });

    expect(schedule).toMatchObject({ courtId: 1, startTime, endTime });
    expect(getLightingSchedules().at(-1)).toBe(schedule);
  });

  it("stores and returns a gate open event for a booking", () => {
    const event = openGate({ bookingId: 42 });

    expect(event).toMatchObject({ bookingId: 42 });
    expect(event.openedAt).toBeInstanceOf(Date);
    expect(getGateEvents().at(-1)).toBe(event);
  });
});
