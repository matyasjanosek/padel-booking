import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/db/client.js", () => ({
  prisma: {
    tournament: { findUnique: vi.fn() },
    tournamentMatch: { findMany: vi.fn() },
  },
}));

vi.mock("../src/services/tournamentStandings.js", () => ({
  getStandings: vi.fn(),
}));

import { prisma } from "../src/db/client.js";
import { getStandings } from "../src/services/tournamentStandings.js";
import { getTournamentOverview } from "../src/services/tournamentOverview.js";

function tournament(overrides = {}) {
  return {
    id: 1,
    name: "Summer Mexicano",
    format: "mexicano",
    status: "active",
    pointsPerMatch: 24,
    roundCount: 6,
    players: [
      { id: 1, displayName: "Alex" },
      { id: 2, displayName: "Sam" },
      { id: 3, displayName: "Jo" },
      { id: 4, displayName: "Kim" },
      { id: 5, displayName: "Pat" },
    ],
    ...overrides,
  };
}

function match(overrides = {}) {
  return {
    id: 1,
    round: 2,
    courtId: 10,
    court: { id: 10, name: "Court 1" },
    scoreA: null,
    scoreB: null,
    status: "pending",
    players: [
      { tournamentPlayerId: 1, team: "a", player: { id: 1, displayName: "Alex" } },
      { tournamentPlayerId: 2, team: "a", player: { id: 2, displayName: "Sam" } },
      { tournamentPlayerId: 3, team: "b", player: { id: 3, displayName: "Jo" } },
      { tournamentPlayerId: 4, team: "b", player: { id: 4, displayName: "Kim" } },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getStandings.mockResolvedValue([]);
});

describe("getTournamentOverview", () => {
  it("returns null for a tournament that does not exist", async () => {
    prisma.tournament.findUnique.mockResolvedValue(null);

    const result = await getTournamentOverview(99);

    expect(result).toBeNull();
  });

  it("reports round 0 and no completion when no round has been generated yet", async () => {
    prisma.tournament.findUnique.mockResolvedValue(tournament());
    prisma.tournamentMatch.findMany.mockResolvedValue([]);

    const overview = await getTournamentOverview(1);

    expect(overview.currentRound).toBe(0);
    expect(overview.isCurrentRoundComplete).toBe(false);
    expect(overview.matches).toEqual([]);
  });

  it("returns only the current round's matches, split into teams, with the court name", async () => {
    prisma.tournament.findUnique.mockResolvedValue(tournament());
    prisma.tournamentMatch.findMany.mockResolvedValue([
      match({ id: 1, round: 1 }),
      match({ id: 2, round: 2 }),
    ]);

    const overview = await getTournamentOverview(1);

    expect(overview.currentRound).toBe(2);
    expect(overview.matches).toEqual([
      {
        id: 2,
        courtId: 10,
        courtName: "Court 1",
        status: "pending",
        scoreA: null,
        scoreB: null,
        teamA: [
          { id: 1, displayName: "Alex" },
          { id: 2, displayName: "Sam" },
        ],
        teamB: [
          { id: 3, displayName: "Jo" },
          { id: 4, displayName: "Kim" },
        ],
      },
    ]);
  });

  it("is complete only once every match in the current round has both scores", async () => {
    prisma.tournament.findUnique.mockResolvedValue(tournament());
    prisma.tournamentMatch.findMany.mockResolvedValue([
      match({ id: 1, round: 1, scoreA: 16, scoreB: 8 }),
      match({ id: 2, round: 1, scoreA: null, scoreB: null }),
    ]);

    const overview = await getTournamentOverview(1);

    expect(overview.isCurrentRoundComplete).toBe(false);
  });

  it("lists registered players who are not in any match of the current round as sitting out", async () => {
    prisma.tournament.findUnique.mockResolvedValue(tournament());
    prisma.tournamentMatch.findMany.mockResolvedValue([match({ round: 1 })]);

    const overview = await getTournamentOverview(1);

    expect(overview.sitOutPlayers).toEqual([{ id: 5, displayName: "Pat" }]);
  });

  it("includes the standings", async () => {
    const standings = [{ rank: 1, id: 1, displayName: "Alex", points: 20 }];
    getStandings.mockResolvedValue(standings);
    prisma.tournament.findUnique.mockResolvedValue(tournament());
    prisma.tournamentMatch.findMany.mockResolvedValue([]);

    const overview = await getTournamentOverview(1);

    expect(overview.standings).toBe(standings);
  });
});
