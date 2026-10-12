import { prisma } from "../db/client.js";

// Points difference (points scored minus points conceded, across a
// player's finished matches) is not stored anywhere, it is derived from
// match history every time standings are read, the same approach already
// used for sit-out fairness in tournamentRounds.js, so it can never drift
// out of sync with the scores actually entered.
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

// Ranked by total points, ties broken by points difference, then by id so
// the order is always fully determined.
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
