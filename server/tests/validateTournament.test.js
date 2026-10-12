import { describe, it, expect, vi } from "vitest";
import {
  validateCreateTournament,
  validateRegisterPlayer,
} from "../src/middleware/validateTournament.js";

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

describe("validateCreateTournament", () => {
  function validBody() {
    return { name: "Summer Americano", format: "americano", pointsPerMatch: "24", courtCount: "2" };
  }

  it("normalises the numbers and calls next for a valid request", () => {
    const req = { body: validBody() };
    const next = vi.fn();

    validateCreateTournament(req, fakeResponse(), next);

    expect(next).toHaveBeenCalled();
    expect(req.body.pointsPerMatch).toBe(24);
    expect(req.body.courtCount).toBe(2);
  });

  it("rejects a missing name", () => {
    const req = { body: { ...validBody(), name: "" } };
    const res = fakeResponse();
    validateCreateTournament(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });

  it("rejects a format that is not one of the three supported ones", () => {
    const req = { body: { ...validBody(), format: "knockout" } };
    const res = fakeResponse();
    validateCreateTournament(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });

  it("rejects a non-positive points per match", () => {
    const req = { body: { ...validBody(), pointsPerMatch: "0" } };
    const res = fakeResponse();
    validateCreateTournament(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });

  it("rejects a non-positive court count", () => {
    const req = { body: { ...validBody(), courtCount: "-1" } };
    const res = fakeResponse();
    validateCreateTournament(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });
});

describe("validateRegisterPlayer", () => {
  it("accepts a userId and normalises it to a number", () => {
    const req = { body: { userId: "5" } };
    const next = vi.fn();

    validateRegisterPlayer(req, fakeResponse(), next);

    expect(next).toHaveBeenCalled();
    expect(req.body.userId).toBe(5);
  });

  it("accepts a displayName", () => {
    const req = { body: { displayName: "Guest Alex" } };
    const next = vi.fn();

    validateRegisterPlayer(req, fakeResponse(), next);

    expect(next).toHaveBeenCalled();
  });

  it("rejects when neither userId nor displayName is given", () => {
    const req = { body: {} };
    const res = fakeResponse();
    validateRegisterPlayer(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });

  it("rejects when both userId and displayName are given", () => {
    const req = { body: { userId: "5", displayName: "Guest Alex" } };
    const res = fakeResponse();
    validateRegisterPlayer(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });

  it("rejects a userId that is not a positive integer", () => {
    const req = { body: { userId: "0" } };
    const res = fakeResponse();
    validateRegisterPlayer(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });

  it("rejects a blank displayName", () => {
    const req = { body: { displayName: "   " } };
    const res = fakeResponse();
    validateRegisterPlayer(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });
});
