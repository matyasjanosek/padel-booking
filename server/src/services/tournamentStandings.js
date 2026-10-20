import { prisma } from "../db/client.js";

async function pointsDifferenceByPlayer(tournamentId) {
  const matchPlayers = await prisma.tournamentMatchPlayer.findMany({
    where: { match: { tournamentId } },
    include: { match: true },
  });

  const difference = new Map();
  for (const matchPlayer of matchPlayers) {
    const { match } = matchPlayer;
    if (match.scoreA === null || match.scoreB === null) {
      continue;
    }
    const ownScore = matchPlayer.team === "a" ? match.scoreA : match.scoreB;
    const opponentScore = matchPlayer.team === "a" ? match.scoreB : match.scoreA;
    const current = difference.get(matchPlayer.tournamentPlayerId) ?? 0;
    difference.set(matchPlayer.tournamentPlayerId, current + (ownScore - opponentScore));
  }
  return difference;
}

export async function getStandings(tournamentId) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { players: true },
  });
  if (!tournament) {
    return null;
  }

  const difference = await pointsDifferenceByPlayer(tournamentId);

  return [...tournament.players]
    .sort((a, b) => {
      const diffA = difference.get(a.id) ?? 0;
      const diffB = difference.get(b.id) ?? 0;
      return b.points - a.points || diffB - diffA || a.id - b.id;
    })
    .map((player, index) => ({
      rank: index + 1,
      id: player.id,
      displayName: player.displayName,
      points: player.points,
      matchesPlayed: player.matchesPlayed,
      pointsDifference: difference.get(player.id) ?? 0,
    }));
}
