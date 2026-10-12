import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/db/client.js", () => ({
  prisma: {
    tournament: { findUnique: vi.fn(), update: vi.fn() },
    tournamentMatch: { findMany: vi.fn(), create: vi.fn() },
    tournamentMatchPlayer: { findMany: vi.fn(), createMany: vi.fn() },
    court: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "../src/db/client.js";
import { generateNextRound } from "../src/services/tournamentRounds.js";

function player(id, overrides = {}) {
  return { id, displayName: `Player ${id}`, points: 0, ...overrides };
}

function mexicanoTournament(overrides = {}) {
  return {
    id: 1,
    format: "mexicano",
    status: "draft",
    courtCount: 2,
    roundCount: 6,
    players: [],
    ...overrides,
  };
}

const courts = [
  { id: 10, name: "Court 1", isActive: true },
  { id: 11, name: "Court 2", isActive: true },
];

let matchCounter;

beforeEach(() => {
  vi.clearAllMocks();
  matchCounter = 0;
  prisma.tournamentMatch.findMany.mockResolvedValue([]);
  prisma.tournamentMatchPlayer.findMany.mockResolvedValue([]);
  prisma.court.findMany.mockResolvedValue(courts);
  prisma.tournamentMatchPlayer.createMany.mockResolvedValue({});
  // Each created match gets its own incrementing id, like a real autoincrement.
  prisma.tournamentMatch.create.mockImplementation(({ data }) => {
    matchCounter += 1;
    return Promise.resolve({ id: matchCounter, ...data });
  });
  // The service only ever uses the callback form with dependent writes
  // (create a match, then its players), so the mock just runs the callback
  // against the same mocked client.
  prisma.$transaction.mockImplementation((callback) => callback(prisma));
});

describe("generateNextRound", () => {
  it("returns not_found for a tournament that does not exist", async () => {
    prisma.tournament.findUnique.mockResolvedValue(null);

    const result = await generateNextRound(99);

    expect(result).toEqual({ outcome: "not_found" });
  });

  it("returns unsupported_format for a tournament that is not mexicano", async () => {
    prisma.tournament.findUnique.mockResolvedValue(mexicanoTournament({ format: "round_robin" }));

    const result = await generateNextRound(1);

    expect(result).toEqual({ outcome: "unsupported_format" });
  });

  it("returns previous_round_incomplete when a match in the current round has no score", async () => {
    prisma.tournament.findUnique.mockResolvedValue(
      mexicanoTournament({ players: [1, 2, 3, 4].map((id) => player(id)) }),
    );
    prisma.tournamentMatch.findMany.mockResolvedValue([
      { id: 1, round: 1, scoreA: 24, scoreB: 18 },
      { id: 2, round: 1, scoreA: null, scoreB: null },
    ]);

    const result = await generateNextRound(1);

    expect(result).toEqual({ outcome: "previous_round_incomplete" });
  });

  it("returns tournament_complete once every configured round has been generated", async () => {
    prisma.tournament.findUnique.mockResolvedValue(
      mexicanoTournament({ roundCount: 1, players: [1, 2, 3, 4].map((id) => player(id)) }),
    );
    prisma.tournamentMatch.findMany.mockResolvedValue([
      { id: 1, round: 1, scoreA: 24, scoreB: 18 },
    ]);

    const result = await generateNextRound(1);

    expect(result).toEqual({ outcome: "tournament_complete" });
  });

  it("returns not_enough_players with fewer than four registered", async () => {
    prisma.tournament.findUnique.mockResolvedValue(
      mexicanoTournament({ players: [1, 2, 3].map((id) => player(id)) }),
    );

    const result = await generateNextRound(1);

    expect(result).toEqual({ outcome: "not_enough_players" });
  });

  it("returns no_courts_available when there are no active courts", async () => {
    prisma.court.findMany.mockResolvedValue([]);
    prisma.tournament.findUnique.mockResolvedValue(
      mexicanoTournament({ players: [1, 2, 3, 4].map((id) => player(id)) }),
    );

    const result = await generateNextRound(1);

    expect(result).toEqual({ outcome: "no_courts_available" });
  });

  it("generates the first round with every player appearing exactly once and activates the tournament", async () => {
    const players = [1, 2, 3, 4, 5, 6, 7, 8].map((id) => player(id));
    prisma.tournament.findUnique.mockResolvedValue(mexicanoTournament({ players }));

    const result = await generateNextRound(1);

    expect(result.outcome).toBe("generated");
    expect(result.round).toBe(1);
    expect(result.matches).toHaveLength(2);
    expect(result.sitOutPlayerIds).toEqual([]);

    const allPlayerIds = result.matches.flatMap((match) => [
      ...match.teamA.map((p) => p.id),
      ...match.teamB.map((p) => p.id),
    ]);
    expect(allPlayerIds.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    for (const match of result.matches) {
      expect(match.teamA).toHaveLength(2);
      expect(match.teamB).toHaveLength(2);
    }
    expect(prisma.tournament.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: "active" },
    });
  });

  it("does not touch tournament status when generating a later round", async () => {
    const players = [1, 2, 3, 4].map((id) => player(id));
    prisma.tournament.findUnique.mockResolvedValue(mexicanoTournament({ players }));
    prisma.tournamentMatch.findMany.mockResolvedValue([
      { id: 1, round: 1, scoreA: 24, scoreB: 18 },
    ]);

    await generateNextRound(1);

    expect(prisma.tournament.update).not.toHaveBeenCalled();
  });

  it("pairs 1st with 4th against 2nd with 3rd, ranked by points, from the second round on", async () => {
    const players = [
      player(1, { points: 10 }),
      player(2, { points: 40 }),
      player(3, { points: 30 }),
      player(4, { points: 20 }),
      player(5, { points: 80 }),
      player(6, { points: 70 }),
      player(7, { points: 60 }),
      player(8, { points: 50 }),
    ];
    prisma.tournament.findUnique.mockResolvedValue(mexicanoTournament({ players }));
    prisma.tournamentMatch.findMany.mockResolvedValue([{ id: 1, round: 1, scoreA: 1, scoreB: 1 }]);
    // Everyone played round 1, nobody has sat out yet.
    prisma.tournamentMatchPlayer.findMany.mockResolvedValue(
      players.map((p) => ({ tournamentPlayerId: p.id })),
    );

    const result = await generateNextRound(1);

    // Ranked by points descending: 5(80) 6(70) 7(60) 8(50) 2(40) 3(30) 4(20) 1(10).
    // Group 1: 1st&4th (5,8) vs 2nd&3rd (6,7). Group 2: 1st&4th (2,1) vs 2nd&3rd (3,4).
    expect(result.matches[0].teamA.map((p) => p.id)).toEqual([5, 8]);
    expect(result.matches[0].teamB.map((p) => p.id)).toEqual([6, 7]);
    expect(result.matches[1].teamA.map((p) => p.id)).toEqual([2, 1]);
    expect(result.matches[1].teamB.map((p) => p.id)).toEqual([3, 4]);
  });

  it("spreads sit-outs so nobody sits out twice before everyone has sat out once", async () => {
    // 10 players, round 1 already played: ids 1-8 played (sat out 0 times so
    // far), ids 9-10 sat out round 1 (sat out once already).
    const players = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((id) => player(id));
    prisma.tournament.findUnique.mockResolvedValue(mexicanoTournament({ players }));
    prisma.tournamentMatch.findMany.mockResolvedValue([{ id: 1, round: 1, scoreA: 1, scoreB: 1 }]);
    prisma.tournamentMatchPlayer.findMany.mockResolvedValue(
      [1, 2, 3, 4, 5, 6, 7, 8].map((id) => ({ tournamentPlayerId: id })),
    );

    const result = await generateNextRound(1);

    // Already-tied at 0 points and 0 sat-outs, lowest ids break the tie, so
    // 1 and 2 sit out this time; 9 and 10, who already sat out once, play.
    expect(result.sitOutPlayerIds.sort()).toEqual([1, 2]);
    const playingIds = result.matches
      .flatMap((match) => [...match.teamA, ...match.teamB])
      .map((p) => p.id);
    expect(playingIds).toContain(9);
    expect(playingIds).toContain(10);
  });

  it("cycles matches across the configured courts", async () => {
    const players = Array.from({ length: 12 }, (_, i) => player(i + 1));
    prisma.tournament.findUnique.mockResolvedValue(mexicanoTournament({ courtCount: 2, players }));

    const result = await generateNextRound(1);

    expect(result.matches).toHaveLength(3);
    expect(result.matches.map((m) => m.courtId)).toEqual([10, 11, 10]);
  });
});
