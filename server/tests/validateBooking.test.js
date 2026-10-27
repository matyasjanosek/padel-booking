import { describe, it, expect, vi } from "vitest";
import {
  validateCreateBooking,
  validateRescheduleBooking,
} from "../src/middleware/validateBooking.js";

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

// 2030-06-10 is a Monday, always in the future relative to these tests.
// 09:00 is a real unit start: units are 30 minutes from local midnight.
const VALID_START = "2030-06-10T09:00:00.000+02:00";

describe("validateCreateBooking", () => {
  it("normalises courtId, startTime and durationMinutes and calls next for a valid request", () => {
    const req = { body: { courtId: "1", startTime: VALID_START, durationMinutes: "90" } };
    const next = vi.fn();

    validateCreateBooking(req, fakeResponse(), next);

    expect(next).toHaveBeenCalled();
    expect(req.body.courtId).toBe(1);
    expect(req.body.startTime).toBeInstanceOf(Date);
    expect(req.body.durationMinutes).toBe(90);
  });

  it("rejects a missing court id", () => {
    const req = { body: { startTime: VALID_START, durationMinutes: 60 } };
    const res = fakeResponse();
    validateCreateBooking(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });

  it("rejects a court id that is not a positive integer", () => {
    const req = { body: { courtId: "0", startTime: VALID_START, durationMinutes: 60 } };
    const res = fakeResponse();
    validateCreateBooking(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });

  it("rejects a start time that does not parse", () => {
    const req = { body: { courtId: "1", startTime: "not a date", durationMinutes: 60 } };
    const res = fakeResponse();
    validateCreateBooking(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });

  it("rejects a start time in the past", () => {
    const req = {
      body: { courtId: "1", startTime: "2020-01-01T09:00:00.000+01:00", durationMinutes: 60 },
    };
    const res = fakeResponse();
    validateCreateBooking(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });

  it("rejects a start time that does not fall on a unit boundary", () => {
    const req = {
      body: { courtId: "1", startTime: "2030-06-10T09:15:00.000+02:00", durationMinutes: 60 },
    };
    const res = fakeResponse();
    validateCreateBooking(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });

  it.each([undefined, 0, 30, 45, -60, "not a number"])(
    "rejects an invalid duration: %p",
    (durationMinutes) => {
      const req = { body: { courtId: "1", startTime: VALID_START, durationMinutes } };
      const res = fakeResponse();
      validateCreateBooking(req, res, vi.fn());
      expect(res.statusCode).toBe(400);
    },
  );

  it.each([60, 90, 120, 150])("accepts every allowed duration: %i minutes", (durationMinutes) => {
    const req = { body: { courtId: "1", startTime: VALID_START, durationMinutes } };
    const next = vi.fn();
    validateCreateBooking(req, fakeResponse(), next);
    expect(next).toHaveBeenCalled();
  });

  it("leaves couponCode undefined when none is given", () => {
    const req = { body: { courtId: "1", startTime: VALID_START, durationMinutes: 60 } };
    validateCreateBooking(req, fakeResponse(), vi.fn());
    expect(req.body.couponCode).toBeUndefined();
  });

  it("trims a given coupon code", () => {
    const req = {
      body: {
        courtId: "1",
        startTime: VALID_START,
        durationMinutes: 60,
        couponCode: "  summer10  ",
      },
    };
    validateCreateBooking(req, fakeResponse(), vi.fn());
    expect(req.body.couponCode).toBe("summer10");
  });

  it("rejects a coupon code that is not a string", () => {
    const req = {
      body: { courtId: "1", startTime: VALID_START, durationMinutes: 60, couponCode: 123 },
    };
    const res = fakeResponse();
    validateCreateBooking(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });
});

describe("validateRescheduleBooking", () => {
  it("normalises courtId and startTime and calls next for a valid request", () => {
    const req = { body: { courtId: "1", startTime: VALID_START } };
    const next = vi.fn();

    validateRescheduleBooking(req, fakeResponse(), next);

    expect(next).toHaveBeenCalled();
    expect(req.body.courtId).toBe(1);
    expect(req.body.startTime).toBeInstanceOf(Date);
  });

  it("accepts a start time in the past, unlike a new booking", () => {
    const req = { body: { courtId: "1", startTime: "2020-01-01T09:00:00.000+01:00" } };
    const next = vi.fn();

    validateRescheduleBooking(req, fakeResponse(), next);

    expect(next).toHaveBeenCalled();
  });

  it("rejects a court id that is not a positive integer", () => {
    const req = { body: { courtId: "0", startTime: VALID_START } };
    const res = fakeResponse();
    validateRescheduleBooking(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });

  it("rejects a start time that does not fall on a unit boundary", () => {
    const req = { body: { courtId: "1", startTime: "2030-06-10T09:15:00.000+02:00" } };
    const res = fakeResponse();
    validateRescheduleBooking(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });
});
