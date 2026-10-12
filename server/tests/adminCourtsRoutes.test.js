import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

vi.mock("../src/services/courts.js", () => ({
  listCourts: vi.fn(),
  renameCourt: vi.fn(),
  setCourtActive: vi.fn(),
}));

vi.mock("../src/services/session.js", () => ({
  readSessionUserId: vi.fn(),
}));
vi.mock("../src/services/auth.js", () => ({
  getUserById: vi.fn(),
}));

import { createApp } from "../src/app.js";
import { listCourts, renameCourt, setCourtActive } from "../src/services/courts.js";
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

describe("GET /api/admin/courts", () => {
  it("returns 401 when not logged in", async () => {
    readSessionUserId.mockReturnValue(null);

    const res = await fetch(`${baseUrl}/api/admin/courts`);

    expect(res.status).toBe(401);
    expect(listCourts).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-admin", async () => {
    getUserById.mockResolvedValue({ id: 1, role: "member" });

    const res = await fetch(`${baseUrl}/api/admin/courts`, { headers: { Cookie: "session=x" } });

    expect(res.status).toBe(403);
    expect(listCourts).not.toHaveBeenCalled();
  });

  it("returns every court, including inactive ones", async () => {
    listCourts.mockResolvedValue([
      { id: 1, name: "Court 1", isActive: true },
      { id: 2, name: "Court 2", isActive: false },
    ]);

    const res = await fetch(`${baseUrl}/api/admin/courts`, { headers: { Cookie: "session=x" } });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([
      { id: 1, name: "Court 1", isActive: true },
      { id: 2, name: "Court 2", isActive: false },
    ]);
  });
});

describe("POST /api/admin/courts/:id/rename", () => {
  function postRename(id, body, cookie = "session=x") {
    return fetch(`${baseUrl}/api/admin/courts/${id}/rename`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify(body),
    });
  }

  it("returns 401 when not logged in", async () => {
    readSessionUserId.mockReturnValue(null);

    const res = await postRename(1, { name: "Centre Court" }, "");

    expect(res.status).toBe(401);
    expect(renameCourt).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-admin", async () => {
    getUserById.mockResolvedValue({ id: 1, role: "member" });

    const res = await postRename(1, { name: "Centre Court" });

    expect(res.status).toBe(403);
    expect(renameCourt).not.toHaveBeenCalled();
  });

  it("rejects a blank name without calling the service", async () => {
    const res = await postRename(1, { name: "" });

    expect(res.status).toBe(400);
    expect(renameCourt).not.toHaveBeenCalled();
  });

  it("returns 404 when the court does not exist", async () => {
    renameCourt.mockResolvedValue({ outcome: "not_found" });

    const res = await postRename(99, { name: "Centre Court" });

    expect(res.status).toBe(404);
  });

  it("renames the court for an admin", async () => {
    renameCourt.mockResolvedValue({
      outcome: "renamed",
      court: { id: 1, name: "Centre Court", isActive: true },
    });

    const res = await postRename(1, { name: "Centre Court" });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 1, name: "Centre Court", isActive: true });
    expect(renameCourt).toHaveBeenCalledWith(1, "Centre Court");
  });
});

describe("POST /api/admin/courts/:id/activate and /deactivate", () => {
  function postStatus(id, action, cookie = "session=x") {
    return fetch(`${baseUrl}/api/admin/courts/${id}/${action}`, {
      method: "POST",
      headers: { Cookie: cookie },
    });
  }

  it("returns 401 when not logged in", async () => {
    readSessionUserId.mockReturnValue(null);

    const res = await postStatus(1, "deactivate", "");

    expect(res.status).toBe(401);
    expect(setCourtActive).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-admin", async () => {
    getUserById.mockResolvedValue({ id: 1, role: "member" });

    const res = await postStatus(1, "deactivate");

    expect(res.status).toBe(403);
    expect(setCourtActive).not.toHaveBeenCalled();
  });

  it("returns 404 when the court does not exist", async () => {
    setCourtActive.mockResolvedValue({ outcome: "not_found" });

    const res = await postStatus(99, "deactivate");

    expect(res.status).toBe(404);
  });

  it("activates the court and calls the service with true", async () => {
    setCourtActive.mockResolvedValue({
      outcome: "activated",
      court: { id: 1, name: "Court 1", isActive: true },
    });

    const res = await postStatus(1, "activate");

    expect(res.status).toBe(200);
    expect(setCourtActive).toHaveBeenCalledWith(1, true);
    expect(await res.json()).toEqual({
      court: { id: 1, name: "Court 1", isActive: true },
      futureConfirmedBookings: 0,
    });
  });

  it("deactivates the court and reports how many confirmed bookings are still ahead of it", async () => {
    setCourtActive.mockResolvedValue({
      outcome: "deactivated",
      court: { id: 1, name: "Court 1", isActive: false },
      futureConfirmedBookings: 3,
    });

    const res = await postStatus(1, "deactivate");

    expect(setCourtActive).toHaveBeenCalledWith(1, false);
    expect(await res.json()).toEqual({
      court: { id: 1, name: "Court 1", isActive: false },
      futureConfirmedBookings: 3,
    });
  });
});
