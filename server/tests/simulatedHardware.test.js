import { describe, it, expect } from "vitest";
import {
  scheduleLighting,
  cancelLighting,
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

  it("removes the matching lighting schedule by court and start time", () => {
    const startTime = new Date("2030-06-10T09:00:00.000Z");
    const endTime = new Date("2030-06-10T10:00:00.000Z");
    scheduleLighting({ courtId: 2, startTime, endTime });

    cancelLighting({ courtId: 2, startTime });

    expect(
      getLightingSchedules().some(
        (schedule) =>
          schedule.courtId === 2 && schedule.startTime.getTime() === startTime.getTime(),
      ),
    ).toBe(false);
  });

  it("does nothing when there is no matching lighting schedule", () => {
    expect(() =>
      cancelLighting({ courtId: 99, startTime: new Date("2030-01-01T00:00:00.000Z") }),
    ).not.toThrow();
  });

  it("stores and returns a gate open event for a booking", () => {
    const event = openGate({ bookingId: 42 });

    expect(event).toMatchObject({ bookingId: 42 });
    expect(event.openedAt).toBeInstanceOf(Date);
    expect(getGateEvents().at(-1)).toBe(event);
  });
});
