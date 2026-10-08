import { describe, it, expect, vi } from "vitest";
import { validateCreateBooking } from "../src/middleware/validateBooking.js";

function fakeResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

// 09:00 on this date is a real slot start (opening hour is 07:00, slots are
// 60 minutes), and it is always in the future relative to these tests.
const VALID_START = "2030-06-10T09:00:00.000+02:00";

describe("validateCreateBooking", () => {
  it("normalises courtId and startTime and calls next for a valid request", () => {
    const req = { body: { courtId: "1", startTime: VALID_START } };
    const next = vi.fn();

    validateCreateBooking(req, fakeResponse(), next);

    expect(next).toHaveBeenCalled();
    expect(req.body.courtId).toBe(1);
    expect(req.body.startTime).toBeInstanceOf(Date);
  });

  it("rejects a missing court id", () => {
    const req = { body: { startTime: VALID_START } };
    const res = fakeResponse();
    validateCreateBooking(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });

  it("rejects a court id that is not a positive integer", () => {
    const req = { body: { courtId: "0", startTime: VALID_START } };
    const res = fakeResponse();
    validateCreateBooking(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });

  it("rejects a start time that does not parse", () => {
    const req = { body: { courtId: "1", startTime: "not a date" } };
    const res = fakeResponse();
    validateCreateBooking(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });

  it("rejects a start time in the past", () => {
    const req = { body: { courtId: "1", startTime: "2020-01-01T09:00:00.000+01:00" } };
    const res = fakeResponse();
    validateCreateBooking(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });

  it("rejects a start time that does not fall on a slot boundary", () => {
    const req = { body: { courtId: "1", startTime: "2030-06-10T09:15:00.000+02:00" } };
    const res = fakeResponse();
    validateCreateBooking(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });

  it("rejects a start time outside the opening hours", () => {
    const req = { body: { courtId: "1", startTime: "2030-06-10T23:00:00.000+02:00" } };
    const res = fakeResponse();
    validateCreateBooking(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });
});
