import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/db/client.js", () => ({
  prisma: {
    tournament: { create: vi.fn(), findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    tournamentPlayer: { create: vi.fn(), findFirst: vi.fn() },
  },
}));

import { prisma } from "../src/db/client.js";
import { createTournament, registerPlayer } from "../src/services/tournaments.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createTournament", () => {
  it("creates a tournament with the given settings", async () => {
    prisma.tournament.create.mockResolvedValue({ id: 1 });

    await createTournament({
      name: "Summer Americano",
      format: "americano",
      pointsPerMatch: 24,
      courtCount: 2,
    });

    expect(prisma.tournament.create).toHaveBeenCalledWith({
      data: { name: "Summer Americano", format: "americano", pointsPerMatch: 24, courtCount: 2 },
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
