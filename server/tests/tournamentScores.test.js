import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/db/client.js", () => ({
  prisma: {
    tournamentMatch: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    tournamentPlayer: { update: vi.fn() },
    tournament: { update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "../src/db/client.js";
import { recordScore } from "../src/services/tournamentScores.js";

// round 1 of 3 by default, so none of the existing tests below are the
// tournament's last round and the new finishing check never kicks in for
// them without saying so explicitly.
function match(overrides = {}) {
  return {
    id: 1,
    tournamentId: 1,
    round: 1,
    scoreA: null,
    scoreB: null,
    tournament: { pointsPerMatch: 24, roundCount: 3 },
    players: [
      { tournamentPlayerId: 10, team: "a" },
      { tournamentPlayerId: 11, team: "a" },
      { tournamentPlayerId: 20, team: "b" },
      { tournamentPlayerId: 21, team: "b" },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  prisma.$transaction.mockResolvedValue(undefined);
  prisma.tournamentMatch.findMany.mockResolvedValue([]);
});

describe("recordScore", () => {
  it("returns not_found when the match does not exist", async () => {
    prisma.tournamentMatch.findUnique.mockResolvedValue(null);

    const result = await recordScore(1, 99, { scoreA: 16, scoreB: 8 });

    expect(result).toEqual({ outcome: "not_found" });
  });

  it("returns not_found when the match belongs to a different tournament", async () => {
    prisma.tournamentMatch.findUnique.mockResolvedValue(match({ tournamentId: 7 }));

    const result = await recordScore(1, 1, { scoreA: 16, scoreB: 8 });

    expect(result).toEqual({ outcome: "not_found" });
  });

  it("returns invalid_total when the scores do not add up to points per match", async () => {
    prisma.tournamentMatch.findUnique.mockResolvedValue(match());

    const result = await recordScore(1, 1, { scoreA: 16, scoreB: 10 });

    expect(result).toEqual({ outcome: "invalid_total" });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("credits each player their team's score and marks the match finished on first entry", async () => {
    prisma.tournamentMatch.findUnique.mockResolvedValue(match());

    const result = await recordScore(1, 1, { scoreA: 16, scoreB: 8 });

    expect(prisma.tournamentMatch.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { scoreA: 16, scoreB: 8, status: "finished" },
    });
    for (const id of [10, 11]) {
      expect(prisma.tournamentPlayer.update).toHaveBeenCalledWith({
        where: { id },
        data: { points: { increment: 16 }, matchesPlayed: { increment: 1 } },
      });
    }
    for (const id of [20, 21]) {
      expect(prisma.tournamentPlayer.update).toHaveBeenCalledWith({
        where: { id },
        data: { points: { increment: 8 }, matchesPlayed: { increment: 1 } },
      });
    }
    expect(result).toEqual({ outcome: "recorded" });
  });

  it("adjusts points by the delta and does not recount matchesPlayed on a correction", async () => {
    prisma.tournamentMatch.findUnique.mockResolvedValue(match({ scoreA: 16, scoreB: 8 }));

    await recordScore(1, 1, { scoreA: 20, scoreB: 4 });

    expect(prisma.tournamentPlayer.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { points: { increment: 4 } },
    });
    expect(prisma.tournamentPlayer.update).toHaveBeenCalledWith({
      where: { id: 20 },
      data: { points: { increment: -4 } },
    });
  });

  it("does not check for a finished tournament outside the last round", async () => {
    prisma.tournamentMatch.findUnique.mockResolvedValue(
      match({ round: 1, tournament: { pointsPerMatch: 24, roundCount: 3 } }),
    );

    await recordScore(1, 1, { scoreA: 16, scoreB: 8 });

    expect(prisma.tournamentMatch.findMany).not.toHaveBeenCalled();
    expect(prisma.tournament.update).not.toHaveBeenCalled();
  });

  it("does not finish the tournament while another match in the last round still has no score", async () => {
    prisma.tournamentMatch.findUnique.mockResolvedValue(
      match({ round: 3, tournament: { pointsPerMatch: 24, roundCount: 3 } }),
    );
    prisma.tournamentMatch.findMany.mockResolvedValue([{ id: 2, scoreA: null, scoreB: null }]);

    await recordScore(1, 1, { scoreA: 16, scoreB: 8 });

    expect(prisma.tournamentMatch.findMany).toHaveBeenCalledWith({
      where: { tournamentId: 1, round: 3, id: { not: 1 } },
    });
    expect(prisma.tournament.update).not.toHaveBeenCalled();
  });

  it("finishes the tournament once the last score of the last round is in", async () => {
    prisma.tournamentMatch.findUnique.mockResolvedValue(
      match({ round: 3, tournament: { pointsPerMatch: 24, roundCount: 3 } }),
    );
    prisma.tournamentMatch.findMany.mockResolvedValue([{ id: 2, scoreA: 14, scoreB: 10 }]);

    await recordScore(1, 1, { scoreA: 16, scoreB: 8 });

    expect(prisma.tournament.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: "finished" },
    });
  });

  it("finishes the tournament when this is the only match in the last round", async () => {
    prisma.tournamentMatch.findUnique.mockResolvedValue(
      match({ round: 3, tournament: { pointsPerMatch: 24, roundCount: 3 } }),
    );
    prisma.tournamentMatch.findMany.mockResolvedValue([]);

    await recordScore(1, 1, { scoreA: 16, scoreB: 8 });

    expect(prisma.tournament.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: "finished" },
    });
  });
});
