import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

vi.mock("../src/services/tournaments.js", () => ({
  listTournaments: vi.fn(),
  createTournament: vi.fn(),
  registerPlayer: vi.fn(),
  removePlayer: vi.fn(),
}));

vi.mock("../src/services/tournamentRounds.js", () => ({
  generateNextRound: vi.fn(),
}));

vi.mock("../src/services/tournamentScores.js", () => ({
  recordScore: vi.fn(),
}));

vi.mock("../src/services/tournamentStandings.js", () => ({
  getStandings: vi.fn(),
}));

vi.mock("../src/services/tournamentOverview.js", () => ({
  getTournamentOverview: vi.fn(),
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
import {
  listTournaments,
  createTournament,
  registerPlayer,
  removePlayer,
} from "../src/services/tournaments.js";
import { generateNextRound } from "../src/services/tournamentRounds.js";
import { recordScore } from "../src/services/tournamentScores.js";
import { getStandings } from "../src/services/tournamentStandings.js";
import { getTournamentOverview } from "../src/services/tournamentOverview.js";
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
  roundCount: 6,
};

function postTournament(body = validTournamentBody, cookie = "session=whatever") {
  return fetch(`${baseUrl}/api/tournaments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(body),
  });
}

describe("GET /api/tournaments", () => {
  it("returns 401 when not logged in", async () => {
    readSessionUserId.mockReturnValue(null);

    const res = await fetch(`${baseUrl}/api/tournaments`);

    expect(res.status).toBe(401);
    expect(listTournaments).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-admin", async () => {
    getUserById.mockResolvedValue({ id: 1, role: "member" });

    const res = await fetch(`${baseUrl}/api/tournaments`, { headers: { Cookie: "session=x" } });

    expect(res.status).toBe(403);
    expect(listTournaments).not.toHaveBeenCalled();
  });

  it("returns every tournament for an admin", async () => {
    listTournaments.mockResolvedValue([{ id: 2, name: "Summer Americano" }]);

    const res = await fetch(`${baseUrl}/api/tournaments`, { headers: { Cookie: "session=x" } });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: 2, name: "Summer Americano" }]);
  });
});

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

describe("DELETE /api/tournaments/:id/players/:playerId", () => {
  function deletePlayer(id, playerId, cookie = "session=whatever") {
    return fetch(`${baseUrl}/api/tournaments/${id}/players/${playerId}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
  }

  it("returns 401 when not logged in", async () => {
    readSessionUserId.mockReturnValue(null);

    const res = await deletePlayer(1, 2, "");

    expect(res.status).toBe(401);
    expect(removePlayer).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-admin", async () => {
    getUserById.mockResolvedValue({ id: 1, role: "member" });

    const res = await deletePlayer(1, 2);

    expect(res.status).toBe(403);
    expect(removePlayer).not.toHaveBeenCalled();
  });

  it("returns 404 when the player is not in this tournament", async () => {
    removePlayer.mockResolvedValue({ outcome: "not_found" });

    const res = await deletePlayer(1, 99);

    expect(res.status).toBe(404);
  });

  it("returns 409 when the tournament is no longer a draft", async () => {
    removePlayer.mockResolvedValue({ outcome: "not_draft" });

    const res = await deletePlayer(1, 2);

    expect(res.status).toBe(409);
  });

  it("removes the player for an admin while the tournament is a draft", async () => {
    removePlayer.mockResolvedValue({ outcome: "removed" });

    const res = await deletePlayer(1, 2);

    expect(res.status).toBe(204);
    expect(removePlayer).toHaveBeenCalledWith(1, 2);
  });
});

describe("POST /api/tournaments/:id/rounds", () => {
  function postRound(id, cookie = "session=whatever") {
    return fetch(`${baseUrl}/api/tournaments/${id}/rounds`, {
      method: "POST",
      headers: { Cookie: cookie },
    });
  }

  it("returns 401 when not logged in", async () => {
    readSessionUserId.mockReturnValue(null);

    const res = await postRound(1, "");

    expect(res.status).toBe(401);
    expect(generateNextRound).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-admin", async () => {
    getUserById.mockResolvedValue({ id: 1, role: "member" });

    const res = await postRound(1);

    expect(res.status).toBe(403);
    expect(generateNextRound).not.toHaveBeenCalled();
  });

  it("returns 404 when the tournament does not exist", async () => {
    generateNextRound.mockResolvedValue({ outcome: "not_found" });

    const res = await postRound(99);

    expect(res.status).toBe(404);
  });

  it("returns 400 for a tournament that is not mexicano", async () => {
    generateNextRound.mockResolvedValue({ outcome: "unsupported_format" });

    const res = await postRound(1);

    expect(res.status).toBe(400);
  });

  it("returns 409 when the previous round still needs scores", async () => {
    generateNextRound.mockResolvedValue({ outcome: "previous_round_incomplete" });

    const res = await postRound(1);

    expect(res.status).toBe(409);
  });

  it("returns 409 once every configured round has been generated", async () => {
    generateNextRound.mockResolvedValue({ outcome: "tournament_complete" });

    const res = await postRound(1);

    expect(res.status).toBe(409);
  });

  it("returns 409 with fewer than four players", async () => {
    generateNextRound.mockResolvedValue({ outcome: "not_enough_players" });

    const res = await postRound(1);

    expect(res.status).toBe(409);
  });

  it("returns 409 when there are no active courts", async () => {
    generateNextRound.mockResolvedValue({ outcome: "no_courts_available" });

    const res = await postRound(1);

    expect(res.status).toBe(409);
  });

  it("returns the generated round for an admin", async () => {
    generateNextRound.mockResolvedValue({
      outcome: "generated",
      round: 2,
      matches: [{ id: 1, round: 2, courtId: 10, teamA: [], teamB: [] }],
      sitOutPlayerIds: [5],
    });

    const res = await postRound(1);

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      round: 2,
      matches: [{ id: 1, round: 2, courtId: 10, teamA: [], teamB: [] }],
      sitOutPlayerIds: [5],
    });
    expect(generateNextRound).toHaveBeenCalledWith(1);
  });
});

describe("POST /api/tournaments/:id/matches/:matchId/score", () => {
  function postScore(id, matchId, body, cookie = "session=whatever") {
    return fetch(`${baseUrl}/api/tournaments/${id}/matches/${matchId}/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify(body),
    });
  }

  const validScore = { scoreA: 16, scoreB: 8 };

  it("returns 401 when not logged in", async () => {
    readSessionUserId.mockReturnValue(null);

    const res = await postScore(1, 2, validScore, "");

    expect(res.status).toBe(401);
    expect(recordScore).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-admin", async () => {
    getUserById.mockResolvedValue({ id: 1, role: "member" });

    const res = await postScore(1, 2, validScore);

    expect(res.status).toBe(403);
    expect(recordScore).not.toHaveBeenCalled();
  });

  it("rejects an invalid body without calling the service", async () => {
    const res = await postScore(1, 2, { scoreA: -1, scoreB: 8 });

    expect(res.status).toBe(400);
    expect(recordScore).not.toHaveBeenCalled();
  });

  it("returns 404 when the match does not exist in this tournament", async () => {
    recordScore.mockResolvedValue({ outcome: "not_found" });

    const res = await postScore(1, 99, validScore);

    expect(res.status).toBe(404);
  });

  it("returns 400 with a clear message when the scores do not add up to the configured total", async () => {
    recordScore.mockResolvedValue({ outcome: "invalid_total" });

    const res = await postScore(1, 2, validScore);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/add up to this tournament's points per match/i);
  });

  it("records the score for an admin", async () => {
    recordScore.mockResolvedValue({ outcome: "recorded" });

    const res = await postScore(1, 2, validScore);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ recorded: true });
    expect(recordScore).toHaveBeenCalledWith(1, 2, validScore);
  });
});

describe("GET /api/tournaments/:id/standings", () => {
  function getStandingsFor(id, cookie = "session=whatever") {
    return fetch(`${baseUrl}/api/tournaments/${id}/standings`, { headers: { Cookie: cookie } });
  }

  it("returns 401 when not logged in", async () => {
    readSessionUserId.mockReturnValue(null);

    const res = await getStandingsFor(1, "");

    expect(res.status).toBe(401);
    expect(getStandings).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-admin", async () => {
    getUserById.mockResolvedValue({ id: 1, role: "member" });

    const res = await getStandingsFor(1);

    expect(res.status).toBe(403);
    expect(getStandings).not.toHaveBeenCalled();
  });

  it("returns 404 when the tournament does not exist", async () => {
    getStandings.mockResolvedValue(null);

    const res = await getStandingsFor(99);

    expect(res.status).toBe(404);
  });

  it("returns the standings for an admin", async () => {
    const standings = [
      { rank: 1, id: 1, displayName: "Alex", points: 30, matchesPlayed: 2, pointsDifference: 10 },
    ];
    getStandings.mockResolvedValue(standings);

    const res = await getStandingsFor(1);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(standings);
    expect(getStandings).toHaveBeenCalledWith(1);
  });
});

describe("GET /api/tournaments/:id/overview", () => {
  it("is public, no session cookie needed", async () => {
    getTournamentOverview.mockResolvedValue({ tournament: { id: 1 }, matches: [] });

    const res = await fetch(`${baseUrl}/api/tournaments/1/overview`);

    expect(res.status).toBe(200);
    expect(getTournamentOverview).toHaveBeenCalledWith(1);
  });

  it("returns 404 when the tournament does not exist", async () => {
    getTournamentOverview.mockResolvedValue(null);

    const res = await fetch(`${baseUrl}/api/tournaments/99/overview`);

    expect(res.status).toBe(404);
  });

  it("returns 400 for an invalid id without calling the service", async () => {
    const res = await fetch(`${baseUrl}/api/tournaments/not-a-number/overview`);

    expect(res.status).toBe(400);
    expect(getTournamentOverview).not.toHaveBeenCalled();
  });

  it("returns the overview", async () => {
    const overview = { tournament: { id: 1, name: "Summer Mexicano" }, matches: [], standings: [] };
    getTournamentOverview.mockResolvedValue(overview);

    const res = await fetch(`${baseUrl}/api/tournaments/1/overview`);

    expect(await res.json()).toEqual(overview);
  });
});
