import { describe, it, expect, vi } from "vitest";
import { validateChangeRole } from "../src/middleware/validateAdminUsers.js";

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

describe("validateChangeRole", () => {
  it.each(["member", "admin"])("calls next for role %s", (role) => {
    const req = { body: { role } };
    const next = vi.fn();

    validateChangeRole(req, fakeResponse(), next);

    expect(next).toHaveBeenCalled();
  });

  it("rejects a role that is not member or admin", () => {
    const req = { body: { role: "owner" } };
    const res = fakeResponse();
    validateChangeRole(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });

  it("rejects a missing role", () => {
    const req = { body: {} };
    const res = fakeResponse();
    validateChangeRole(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });
});
