import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/db/client.js", () => ({
  prisma: {
    tournament: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
    user: { findUnique: vi.fn() },
    tournamentPlayer: { create: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
  },
}));

import { prisma } from "../src/db/client.js";
import {
  listTournaments,
  createTournament,
  registerPlayer,
  removePlayer,
} from "../src/services/tournaments.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listTournaments", () => {
  it("returns every tournament, newest first", async () => {
    prisma.tournament.findMany.mockResolvedValue([]);

    await listTournaments();

    expect(prisma.tournament.findMany).toHaveBeenCalledWith({ orderBy: { id: "desc" } });
  });
});

describe("createTournament", () => {
  it("creates a tournament with the given settings", async () => {
    prisma.tournament.create.mockResolvedValue({ id: 1 });

    await createTournament({
      name: "Summer Americano",
      format: "americano",
      pointsPerMatch: 24,
      courtCount: 2,
      roundCount: 6,
    });

    expect(prisma.tournament.create).toHaveBeenCalledWith({
      data: {
        name: "Summer Americano",
        format: "americano",
        pointsPerMatch: 24,
        courtCount: 2,
        roundCount: 6,
      },
    });
  });
});

describe("registerPlayer", () => {
  const tournament = { id: 1, status: "draft" };

  it("returns tournament_not_found for a tournament that does not exist", async () => {
    prisma.tournament.findUnique.mockResolvedValue(null);

    const result = await registerPlayer(99, { displayName: "Alex" });

    expect(result).toEqual({ outcome: "tournament_not_found" });
  });

  it("registers a guest with the given display name", async () => {
    prisma.tournament.findUnique.mockResolvedValue(tournament);
    prisma.tournamentPlayer.create.mockResolvedValue({ id: 1, displayName: "Guest Alex" });

    const result = await registerPlayer(1, { displayName: "Guest Alex" });

    expect(prisma.tournamentPlayer.create).toHaveBeenCalledWith({
      data: { tournamentId: 1, displayName: "Guest Alex" },
    });
    expect(result).toEqual({ outcome: "registered", player: { id: 1, displayName: "Guest Alex" } });
  });

  it("registers a member using their own account name as the display name", async () => {
    prisma.tournament.findUnique.mockResolvedValue(tournament);
    prisma.user.findUnique.mockResolvedValue({ id: 5, name: "Alex" });
    prisma.tournamentPlayer.findFirst.mockResolvedValue(null);
    prisma.tournamentPlayer.create.mockResolvedValue({ id: 2, userId: 5, displayName: "Alex" });

    const result = await registerPlayer(1, { userId: 5 });

    expect(prisma.tournamentPlayer.create).toHaveBeenCalledWith({
      data: { tournamentId: 1, userId: 5, displayName: "Alex" },
    });
    expect(result.outcome).toBe("registered");
  });

  it("returns user_not_found for a member id that does not exist", async () => {
    prisma.tournament.findUnique.mockResolvedValue(tournament);
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await registerPlayer(1, { userId: 999 });

    expect(result).toEqual({ outcome: "user_not_found" });
    expect(prisma.tournamentPlayer.create).not.toHaveBeenCalled();
  });

  it("returns already_registered when the member is already in this tournament", async () => {
    prisma.tournament.findUnique.mockResolvedValue(tournament);
    prisma.user.findUnique.mockResolvedValue({ id: 5, name: "Alex" });
    prisma.tournamentPlayer.findFirst.mockResolvedValue({ id: 2, userId: 5 });

    const result = await registerPlayer(1, { userId: 5 });

    expect(result).toEqual({ outcome: "already_registered" });
    expect(prisma.tournamentPlayer.create).not.toHaveBeenCalled();
  });
});

describe("removePlayer", () => {
  it("returns not_found when the player does not exist", async () => {
    prisma.tournamentPlayer.findUnique.mockResolvedValue(null);

    const result = await removePlayer(1, 99);

    expect(result).toEqual({ outcome: "not_found" });
  });

  it("returns not_found when the player belongs to a different tournament", async () => {
    prisma.tournamentPlayer.findUnique.mockResolvedValue({
      id: 2,
      tournamentId: 7,
      tournament: { status: "draft" },
    });

    const result = await removePlayer(1, 2);

    expect(result).toEqual({ outcome: "not_found" });
    expect(prisma.tournamentPlayer.delete).not.toHaveBeenCalled();
  });

  it.each(["active", "finished"])(
    "returns not_draft and does not remove the player when the tournament is %s",
    async (status) => {
      prisma.tournamentPlayer.findUnique.mockResolvedValue({
        id: 2,
        tournamentId: 1,
        tournament: { status },
      });

      const result = await removePlayer(1, 2);

      expect(result).toEqual({ outcome: "not_draft" });
      expect(prisma.tournamentPlayer.delete).not.toHaveBeenCalled();
    },
  );

  it("removes the player while the tournament is still a draft", async () => {
    prisma.tournamentPlayer.findUnique.mockResolvedValue({
      id: 2,
      tournamentId: 1,
      tournament: { status: "draft" },
    });
    prisma.tournamentPlayer.delete.mockResolvedValue({});

    const result = await removePlayer(1, 2);

    expect(prisma.tournamentPlayer.delete).toHaveBeenCalledWith({ where: { id: 2 } });
    expect(result).toEqual({ outcome: "removed" });
  });
});
