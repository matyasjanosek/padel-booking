import { prisma } from "../db/client.js";

export function createTournament({ name, format, pointsPerMatch, courtCount }) {
  return prisma.tournament.create({
    data: { name, format, pointsPerMatch, courtCount },
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
