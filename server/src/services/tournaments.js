import { prisma } from "../db/client.js";

export function listTournaments() {
  return prisma.tournament.findMany({ orderBy: { id: "desc" } });
}

export function createTournament({ name, format, pointsPerMatch, courtCount, roundCount }) {
  return prisma.tournament.create({
    data: { name, format, pointsPerMatch, courtCount, roundCount },
  });
}

export async function registerPlayer(tournamentId, { userId, displayName }) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) {
    return { outcome: "tournament_not_found" };
  }

  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { outcome: "user_not_found" };
    }
    const existing = await prisma.tournamentPlayer.findFirst({ where: { tournamentId, userId } });
    if (existing) {
      return { outcome: "already_registered" };
    }
    const player = await prisma.tournamentPlayer.create({
      data: { tournamentId, userId, displayName: user.name },
    });
    return { outcome: "registered", player };
  }

  const player = await prisma.tournamentPlayer.create({
    data: { tournamentId, displayName },
  });
  return { outcome: "registered", player };
}

export async function removePlayer(tournamentId, playerId) {
  const player = await prisma.tournamentPlayer.findUnique({
    where: { id: playerId },
    include: { tournament: true },
  });
  if (!player || player.tournamentId !== tournamentId) {
    return { outcome: "not_found" };
  }
  if (player.tournament.status !== "draft") {
    return { outcome: "not_draft" };
  }

  await prisma.tournamentPlayer.delete({ where: { id: playerId } });
  return { outcome: "removed" };
}
