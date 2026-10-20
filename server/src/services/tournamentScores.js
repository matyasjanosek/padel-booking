import { prisma } from "../db/client.js";

export async function recordScore(tournamentId, matchId, { scoreA, scoreB }) {
  const match = await prisma.tournamentMatch.findUnique({
    where: { id: matchId },
    include: { players: true, tournament: true },
  });
  if (!match || match.tournamentId !== tournamentId) {
    return { outcome: "not_found" };
  }
  if (scoreA + scoreB !== match.tournament.pointsPerMatch) {
    return { outcome: "invalid_total" };
  }

  const isFirstEntry = match.scoreA === null || match.scoreB === null;
  const deltaA = scoreA - (match.scoreA ?? 0);
  const deltaB = scoreB - (match.scoreB ?? 0);

  const teamAIds = match.players
    .filter((player) => player.team === "a")
    .map((player) => player.tournamentPlayerId);
  const teamBIds = match.players
    .filter((player) => player.team === "b")
    .map((player) => player.tournamentPlayerId);

  function creditData(delta) {
    return {
      points: { increment: delta },
      ...(isFirstEntry ? { matchesPlayed: { increment: 1 } } : {}),
    };
  }

  const isLastRound = match.round === match.tournament.roundCount;
  let tournamentFinished = false;
  if (isLastRound) {
    const otherMatchesInRound = await prisma.tournamentMatch.findMany({
      where: { tournamentId, round: match.round, id: { not: matchId } },
    });
    tournamentFinished = otherMatchesInRound.every(
      (otherMatch) => otherMatch.scoreA !== null && otherMatch.scoreB !== null,
    );
  }

  await prisma.$transaction([
    prisma.tournamentMatch.update({
      where: { id: matchId },
      data: { scoreA, scoreB, status: "finished" },
    }),
    ...teamAIds.map((id) =>
      prisma.tournamentPlayer.update({ where: { id }, data: creditData(deltaA) }),
    ),
    ...teamBIds.map((id) =>
      prisma.tournamentPlayer.update({ where: { id }, data: creditData(deltaB) }),
    ),
    ...(tournamentFinished
      ? [prisma.tournament.update({ where: { id: tournamentId }, data: { status: "finished" } })]
      : []),
  ]);

  return { outcome: "recorded" };
}
