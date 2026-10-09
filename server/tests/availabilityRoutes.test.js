import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

vi.mock("../src/services/availability.js", () => ({
  getAvailability: vi.fn(),
}));

import { createApp } from "../src/app.js";
import { getAvailability } from "../src/services/availability.js";

let server;
let baseUrl;

beforeAll(async () => {
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://localhost:${server.address().port}`;
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  vi.clearAllMocks();
});

const fakeSlots = [
  {
    startTime: "2026-09-20T07:00:00.000+02:00",
    endTime: "2026-09-20T08:00:00.000+02:00",
    status: "free",
  },
];

describe("GET /api/availability", () => {
  it("returns the slots for a valid date and court", async () => {
    getAvailability.mockResolvedValue(fakeSlots);

    const res = await fetch(`${baseUrl}/api/availability?date=2026-09-20&courtId=1`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      date: "2026-09-20",
      courtId: 1,
      slotMinutes: 60,
      price: 400,
      slots: fakeSlots,
    });
    expect(getAvailability).toHaveBeenCalledWith(1, "2026-09-20");
  });

  it("returns 404 when the court does not exist", async () => {
    getAvailability.mockResolvedValue(null);

    const res = await fetch(`${baseUrl}/api/availability?date=2026-09-20&courtId=99`);

    expect(res.status).toBe(404);
  });

  it("rejects a missing date", async () => {
    const res = await fetch(`${baseUrl}/api/availability?courtId=1`);

    expect(res.status).toBe(400);
    expect(getAvailability).not.toHaveBeenCalled();
  });

  it("rejects a date that is not a real calendar date", async () => {
    const res = await fetch(`${baseUrl}/api/availability?date=2026-02-30&courtId=1`);

    expect(res.status).toBe(400);
    expect(getAvailability).not.toHaveBeenCalled();
  });

  it("rejects a badly formed date", async () => {
    const res = await fetch(`${baseUrl}/api/availability?date=20-9-2026&courtId=1`);

    expect(res.status).toBe(400);
    expect(getAvailability).not.toHaveBeenCalled();
  });

  it("rejects a missing court id", async () => {
    const res = await fetch(`${baseUrl}/api/availability?date=2026-09-20`);

    expect(res.status).toBe(400);
    expect(getAvailability).not.toHaveBeenCalled();
  });

  it("rejects a court id that is not a positive integer", async () => {
    const res = await fetch(`${baseUrl}/api/availability?date=2026-09-20&courtId=0`);

    expect(res.status).toBe(400);
    expect(getAvailability).not.toHaveBeenCalled();
  });
});
