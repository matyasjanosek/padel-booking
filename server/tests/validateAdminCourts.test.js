import { describe, it, expect, vi } from "vitest";
import { validateRenameCourt } from "../src/middleware/validateAdminCourts.js";

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

describe("validateRenameCourt", () => {
  it("calls next for a valid name", () => {
    const req = { body: { name: "Centre Court" } };
    const next = vi.fn();

    validateRenameCourt(req, fakeResponse(), next);

    expect(next).toHaveBeenCalled();
  });

  it("rejects a missing name", () => {
    const req = { body: {} };
    const res = fakeResponse();
    validateRenameCourt(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });

  it("rejects a blank name", () => {
    const req = { body: { name: "   " } };
    const res = fakeResponse();
    validateRenameCourt(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });
});
