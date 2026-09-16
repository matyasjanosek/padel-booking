import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/services/session.js", () => ({
  readSessionUserId: vi.fn(),
}));
vi.mock("../src/services/auth.js", () => ({
  getUserById: vi.fn(),
}));

import { readSessionUserId } from "../src/services/session.js";
import { getUserById } from "../src/services/auth.js";
import { requireAuth, requireAdmin } from "../src/middleware/auth.js";

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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireAuth", () => {
  it("returns 401 when there is no session cookie", async () => {
    readSessionUserId.mockReturnValue(null);
    const res = fakeResponse();
    const next = vi.fn();

    await requireAuth({ headers: {} }, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when the session points at a user that no longer exists", async () => {
    readSessionUserId.mockReturnValue(1);
    getUserById.mockResolvedValue(null);
    const res = fakeResponse();
    const next = vi.fn();

    await requireAuth({ headers: {} }, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("attaches the user and calls next for a valid session", async () => {
    readSessionUserId.mockReturnValue(1);
    const user = { id: 1, role: "member" };
    getUserById.mockResolvedValue(user);
    const req = { headers: {} };
    const next = vi.fn();

    await requireAuth(req, fakeResponse(), next);

    expect(req.user).toBe(user);
    expect(next).toHaveBeenCalled();
  });
});

describe("requireAdmin", () => {
  it("returns 403 for a member", () => {
    const res = fakeResponse();
    const next = vi.fn();

    requireAdmin({ user: { role: "member" } }, res, next);

    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next for an admin", () => {
    const res = fakeResponse();
    const next = vi.fn();

    requireAdmin({ user: { role: "admin" } }, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBeNull();
  });
});
