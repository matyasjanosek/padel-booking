import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

vi.mock("../src/services/tournaments.js", () => ({
  createTournament: vi.fn(),
  registerPlayer: vi.fn(),
}));

// requireAuth is real middleware; these are the two services it calls, so a
// logged in admin or member can be simulated without real session cookies.
vi.mock("../src/services/session.js", () => ({
  readSessionUserId: vi.fn(),
}));
vi.mock("../src/services/auth.js", () => ({
  getUserById: vi.fn(),
}));

import { createApp } from "../src/app.js";
import { createTournament, registerPlayer } from "../src/services/tournaments.js";
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

const validTournamentBody = {
  name: "Summer Americano",
  format: "americano",
  pointsPerMatch: 24,
  courtCount: 2,
};

function postTournament(body = validTournamentBody, cookie = "session=whatever") {
  return fetch(`${baseUrl}/api/tournaments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(body),
  });
}

describe("POST /api/tournaments", () => {
  it("returns 401 when not logged in", async () => {
    readSessionUserId.mockReturnValue(null);

    const res = await postTournament(validTournamentBody, "");

    expect(res.status).toBe(401);
    expect(createTournament).not.toHaveBeenCalled();
  });

  it("returns 403 for a logged in member who is not an admin", async () => {
    getUserById.mockResolvedValue({ id: 1, role: "member" });

    const res = await postTournament();

    expect(res.status).toBe(403);
    expect(createTournament).not.toHaveBeenCalled();
  });

  it("rejects an invalid request without calling the service", async () => {
    const res = await postTournament({ ...validTournamentBody, format: "knockout" });

    expect(res.status).toBe(400);
    expect(createTournament).not.toHaveBeenCalled();
  });

  it("creates the tournament for an admin", async () => {
    createTournament.mockResolvedValue({ id: 1, ...validTournamentBody, status: "draft" });

    const res = await postTournament();

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: 1, ...validTournamentBody, status: "draft" });
    expect(createTournament).toHaveBeenCalledWith(validTournamentBody);
  });
});

describe("POST /api/tournaments/:id/players", () => {
  function postPlayer(id, body, cookie = "session=whatever") {
    return fetch(`${baseUrl}/api/tournaments/${id}/players`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify(body),
    });
  }

  it("returns 401 when not logged in", async () => {
    readSessionUserId.mockReturnValue(null);

    const res = await postPlayer(1, { displayName: "Guest Alex" }, "");

    expect(res.status).toBe(401);
    expect(registerPlayer).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-admin", async () => {
    getUserById.mockResolvedValue({ id: 1, role: "member" });

    const res = await postPlayer(1, { displayName: "Guest Alex" });

    expect(res.status).toBe(403);
    expect(registerPlayer).not.toHaveBeenCalled();
  });

  it("rejects a body with neither a user id nor a display name", async () => {
    const res = await postPlayer(1, {});

    expect(res.status).toBe(400);
    expect(registerPlayer).not.toHaveBeenCalled();
  });

  it("returns 404 when the tournament does not exist", async () => {
    registerPlayer.mockResolvedValue({ outcome: "tournament_not_found" });

    const res = await postPlayer(99, { displayName: "Guest Alex" });

    expect(res.status).toBe(404);
  });

  it("returns 404 when the member does not exist", async () => {
    registerPlayer.mockResolvedValue({ outcome: "user_not_found" });

    const res = await postPlayer(1, { userId: 999 });

    expect(res.status).toBe(404);
  });

  it("returns 409 when the member is already registered", async () => {
    registerPlayer.mockResolvedValue({ outcome: "already_registered" });

    const res = await postPlayer(1, { userId: 5 });

    expect(res.status).toBe(409);
  });

  it("registers a guest player", async () => {
    registerPlayer.mockResolvedValue({
      outcome: "registered",
      player: { id: 1, displayName: "Guest Alex" },
    });

    const res = await postPlayer(1, { displayName: "Guest Alex" });

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: 1, displayName: "Guest Alex" });
    expect(registerPlayer).toHaveBeenCalledWith(1, { displayName: "Guest Alex" });
  });
});
