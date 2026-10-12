import { describe, it, expect, vi } from "vitest";
import { validateAdminBookingsQuery } from "../src/middleware/validateAdminBookings.js";

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

describe("validateAdminBookingsQuery", () => {
  it("calls next with no filters at all", () => {
    const req = { query: {} };
    const next = vi.fn();

    validateAdminBookingsQuery(req, fakeResponse(), next);

    expect(next).toHaveBeenCalled();
  });

  it("accepts a valid status", () => {
    const req = { query: { status: "confirmed" } };
    const next = vi.fn();

    validateAdminBookingsQuery(req, fakeResponse(), next);

    expect(next).toHaveBeenCalled();
  });

  it("rejects an invalid status", () => {
    const req = { query: { status: "finished" } };
    const res = fakeResponse();
    validateAdminBookingsQuery(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });

  it("normalises a valid court id to a number", () => {
    const req = { query: { courtId: "2" } };
    const next = vi.fn();

    validateAdminBookingsQuery(req, fakeResponse(), next);

    expect(next).toHaveBeenCalled();
    expect(req.query.courtId).toBe(2);
  });

  it("rejects a court id that is not a positive integer", () => {
    const req = { query: { courtId: "0" } };
    const res = fakeResponse();
    validateAdminBookingsQuery(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });

  it("accepts a valid date", () => {
    const req = { query: { date: "2030-06-10" } };
    const next = vi.fn();

    validateAdminBookingsQuery(req, fakeResponse(), next);

    expect(next).toHaveBeenCalled();
  });

  it("rejects a badly formed date", () => {
    const req = { query: { date: "10-06-2030" } };
    const res = fakeResponse();
    validateAdminBookingsQuery(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });
});
