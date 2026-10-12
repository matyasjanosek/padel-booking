import { prisma } from "../db/client.js";
import { getStandings } from "./tournamentStandings.js";

function toPublicMatch(match) {
  return {
    id: match.id,
    courtId: match.courtId,
    courtName: match.court.name,
    status: match.status,
    scoreA: match.scoreA,
    scoreB: match.scoreB,
    teamA: match.players
      .filter((matchPlayer) => matchPlayer.team === "a")
      .map((matchPlayer) => ({
        id: matchPlayer.player.id,
        displayName: matchPlayer.player.displayName,
      })),
    teamB: match.players
      .filter((matchPlayer) => matchPlayer.team === "b")
      .map((matchPlayer) => ({
        id: matchPlayer.player.id,
        displayName: matchPlayer.player.displayName,
      })),
  };
}

// Everything the public tournament page and the TV display need, read only,
// no login required for either. "The next round" has no matches to show
// yet, Mexicano only ever generates one round at a time, so this reports
// whether the current round is finished and the tournament's round count
// instead, so a viewer can see "round 3 of 6, waiting for the next round"
// rather than being shown pairings that do not exist.
export async function getTournamentOverview(tournamentId) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { players: true },
  });
  if (!tournament) {
    return null;
  }

  const matches = await prisma.tournamentMatch.findMany({
    where: { tournamentId },
    include: { court: true, players: { include: { player: true } } },
  });
  const currentRound = matches.reduce((max, match) => Math.max(max, match.round), 0);
  const currentRoundMatches = matches.filter((match) => match.round === currentRound);
  const isCurrentRoundComplete =
    currentRound > 0 &&
    currentRoundMatches.every((match) => match.scoreA !== null && match.scoreB !== null);

  const playingPlayerIds = new Set(
    currentRoundMatches.flatMap((match) => match.players.map((p) => p.tournamentPlayerId)),
  );
  const sitOutPlayers = tournament.players
    .filter((player) => !playingPlayerIds.has(player.id))
    .map((player) => ({ id: player.id, displayName: player.displayName }));

  const standings = await getStandings(tournamentId);

  return {
    tournament: {
      id: tournament.id,
      name: tournament.name,
      format: tournament.format,
      status: tournament.status,
      pointsPerMatch: tournament.pointsPerMatch,
      roundCount: tournament.roundCount,
    },
    currentRound,
    isCurrentRoundComplete,
    matches: currentRoundMatches.map(toPublicMatch),
    sitOutPlayers,
    standings,
  };
}
