import { prisma } from "../db/client.js";

// Newest first: the admin cares about whichever tournament is current, not
// ones that finished long ago.
export function listTournaments() {
  return prisma.tournament.findMany({ orderBy: { id: "desc" } });
}

export function createTournament({ name, format, pointsPerMatch, courtCount, roundCount }) {
  return prisma.tournament.create({
    data: { name, format, pointsPerMatch, courtCount, roundCount },
  });
}

// userId registers a member, using their own account name as the display
// name shown on the TV screen, rather than asking the admin to retype it.
// displayName registers a guest, who has no account at all. Exactly one of
// the two is set, validateRegisterPlayer already enforced that.
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

// Only while the tournament is still a draft: once a schedule exists,
// matches reference tournament players directly, and removing one would
// leave those matches pointing at a player who is no longer there.
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
