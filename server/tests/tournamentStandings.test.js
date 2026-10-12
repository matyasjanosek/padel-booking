import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/db/client.js", () => ({
  prisma: {
    tournament: { findUnique: vi.fn() },
    tournamentMatchPlayer: { findMany: vi.fn() },
  },
}));

import { prisma } from "../src/db/client.js";
import { getStandings } from "../src/services/tournamentStandings.js";

function player(id, points) {
  return { id, displayName: `Player ${id}`, points, matchesPlayed: 1 };
}

beforeEach(() => {
  vi.clearAllMocks();
  prisma.tournamentMatchPlayer.findMany.mockResolvedValue([]);
});

describe("getStandings", () => {
  it("returns null for a tournament that does not exist", async () => {
    prisma.tournament.findUnique.mockResolvedValue(null);

    const result = await getStandings(99);

    expect(result).toBeNull();
  });

  it("ranks players by total points, highest first", async () => {
    prisma.tournament.findUnique.mockResolvedValue({
      id: 1,
      players: [player(1, 10), player(2, 30), player(3, 20)],
    });

    const standings = await getStandings(1);

    expect(standings.map((s) => s.id)).toEqual([2, 3, 1]);
    expect(standings[0]).toEqual({
      rank: 1,
      id: 2,
      displayName: "Player 2",
      points: 30,
      matchesPlayed: 1,
      pointsDifference: 0,
    });
  });

  it("breaks a tie on points using points difference", async () => {
    prisma.tournament.findUnique.mockResolvedValue({
      id: 1,
      players: [player(1, 20), player(2, 20)],
    });
    prisma.tournamentMatchPlayer.findMany.mockResolvedValue([
      { tournamentPlayerId: 1, team: "a", match: { scoreA: 20, scoreB: 4 } },
      { tournamentPlayerId: 2, team: "a", match: { scoreA: 12, scoreB: 12 } },
    ]);

    const standings = await getStandings(1);

    expect(standings.map((s) => s.id)).toEqual([1, 2]);
    expect(standings[0].pointsDifference).toBe(16);
    expect(standings[1].pointsDifference).toBe(0);
  });

  it("breaks a full tie by player id, lowest first", async () => {
    prisma.tournament.findUnique.mockResolvedValue({
      id: 1,
      players: [player(2, 10), player(1, 10)],
    });

    const standings = await getStandings(1);

    expect(standings.map((s) => s.id)).toEqual([1, 2]);
  });

  it("ignores a match that has not been scored yet", async () => {
    prisma.tournament.findUnique.mockResolvedValue({ id: 1, players: [player(1, 0)] });
    prisma.tournamentMatchPlayer.findMany.mockResolvedValue([
      { tournamentPlayerId: 1, team: "a", match: { scoreA: null, scoreB: null } },
    ]);

    const standings = await getStandings(1);

    expect(standings[0].pointsDifference).toBe(0);
  });

  it("sums points difference across more than one match, and from either side", async () => {
    prisma.tournament.findUnique.mockResolvedValue({ id: 1, players: [player(1, 0)] });
    prisma.tournamentMatchPlayer.findMany.mockResolvedValue([
      { tournamentPlayerId: 1, team: "a", match: { scoreA: 16, scoreB: 8 } },
      { tournamentPlayerId: 1, team: "b", match: { scoreA: 20, scoreB: 4 } },
    ]);

    const standings = await getStandings(1);

    // +8 from the first match (16-8), -16 from the second (4-20 as team b).
    expect(standings[0].pointsDifference).toBe(-8);
  });
});
