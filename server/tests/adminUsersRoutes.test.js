import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

vi.mock("../src/services/adminUsers.js", () => ({
  listUsersForAdmin: vi.fn(),
  changeUserRole: vi.fn(),
}));

vi.mock("../src/services/session.js", () => ({
  readSessionUserId: vi.fn(),
}));
vi.mock("../src/services/auth.js", () => ({
  getUserById: vi.fn(),
}));

import { createApp } from "../src/app.js";
import { listUsersForAdmin, changeUserRole } from "../src/services/adminUsers.js";
import { readSessionUserId } from "../src/services/session.js";
import { getUserById } from "../src/services/auth.js";

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
  readSessionUserId.mockReturnValue(1);
  getUserById.mockResolvedValue({ id: 1, role: "admin" });
});

describe("GET /api/admin/users", () => {
  it("returns 401 when not logged in", async () => {
    readSessionUserId.mockReturnValue(null);

    const res = await fetch(`${baseUrl}/api/admin/users`);

    expect(res.status).toBe(401);
    expect(listUsersForAdmin).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-admin", async () => {
    getUserById.mockResolvedValue({ id: 1, role: "member" });

    const res = await fetch(`${baseUrl}/api/admin/users`, { headers: { Cookie: "session=x" } });

    expect(res.status).toBe(403);
    expect(listUsersForAdmin).not.toHaveBeenCalled();
  });

  it("returns the users for an admin", async () => {
    listUsersForAdmin.mockResolvedValue([{ id: 1, email: "a@example.com", role: "admin" }]);

    const res = await fetch(`${baseUrl}/api/admin/users`, { headers: { Cookie: "session=x" } });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: 1, email: "a@example.com", role: "admin" }]);
  });
});

describe("POST /api/admin/users/:id/role", () => {
  function postRole(id, body, cookie = "session=x") {
    return fetch(`${baseUrl}/api/admin/users/${id}/role`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify(body),
    });
  }

  it("returns 401 when not logged in", async () => {
    readSessionUserId.mockReturnValue(null);

    const res = await postRole(7, { role: "admin" }, "");

    expect(res.status).toBe(401);
    expect(changeUserRole).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-admin", async () => {
    getUserById.mockResolvedValue({ id: 1, role: "member" });

    const res = await postRole(7, { role: "admin" });

    expect(res.status).toBe(403);
    expect(changeUserRole).not.toHaveBeenCalled();
  });

  it("rejects an invalid role without calling the service", async () => {
    const res = await postRole(7, { role: "owner" });

    expect(res.status).toBe(400);
    expect(changeUserRole).not.toHaveBeenCalled();
  });

  it("returns 404 when the user does not exist", async () => {
    changeUserRole.mockResolvedValue({ outcome: "not_found" });

    const res = await postRole(99, { role: "admin" });

    expect(res.status).toBe(404);
  });

  it("returns 409 with a clear message when an admin tries to remove their own admin role", async () => {
    changeUserRole.mockResolvedValue({ outcome: "cannot_remove_own_admin" });

    const res = await postRole(1, { role: "member" });

    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/cannot remove your own admin role/i);
  });

  it("changes the role and passes the logged in admin's own id for the self check", async () => {
    changeUserRole.mockResolvedValue({
      outcome: "updated",
      user: { id: 7, email: "b@example.com", role: "admin" },
    });

    const res = await postRole(7, { role: "admin" });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 7, email: "b@example.com", role: "admin" });
    expect(changeUserRole).toHaveBeenCalledWith(7, "admin", 1);
  });
});
