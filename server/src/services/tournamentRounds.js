import { prisma } from "../db/client.js";

// Fisher-Yates. Not security sensitive the way a gate code or session token
// is, there is nothing to protect against, so Math.random is fine here.
function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Ranks are 1v4 vs 2v3 within each consecutive group of four, so the
// strongest and weakest of each group face the two in the middle. Callers
// only ever pass a list whose length is a multiple of four, see sitOutCount.
function pairIntoMatchups(rankedPlayers) {
  const matchups = [];
  for (let i = 0; i < rankedPlayers.length; i += 4) {
    const [first, second, third, fourth] = rankedPlayers.slice(i, i + 4);
    matchups.push({ teamA: [first, fourth], teamB: [second, third] });
  }
  return matchups;
}

// How many rounds each player has actually been scheduled into so far,
// counted from existing match rows rather than trusting a stored total, so
// this never depends on whether a later scoring step has run yet.
async function countTimesPlayed(tournamentId) {
  const matchPlayers = await prisma.tournamentMatchPlayer.findMany({
    where: { match: { tournamentId } },
    select: { tournamentPlayerId: true },
  });
  const timesPlayed = new Map();
  for (const { tournamentPlayerId } of matchPlayers) {
    timesPlayed.set(tournamentPlayerId, (timesPlayed.get(tournamentPlayerId) ?? 0) + 1);
  }
  return timesPlayed;
}

// Picks who sits out this round when the player count is not divisible by
// four. Prioritises whoever has sat out the fewest times so far, so nobody
// sits out twice before everyone has sat out once; ties go to whoever has
// fewer points, then lowest id, purely to keep the choice deterministic.
function pickSitOuts(players, roundsSoFar, timesPlayed, sitOutCount) {
  if (sitOutCount === 0) {
    return [];
  }
  const timesSatOut = (player) => roundsSoFar - (timesPlayed.get(player.id) ?? 0);
  const sorted = [...players].sort(
    (a, b) => timesSatOut(a) - timesSatOut(b) || a.points - b.points || a.id - b.id,
  );
  return sorted.slice(0, sitOutCount);
}

// Generates exactly one round, not the whole tournament schedule. Mexicano
// only knows how to pair players once the previous round's results are in,
// so there is nothing to generate upfront.
export async function generateNextRound(tournamentId) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { players: true },
  });
  if (!tournament) {
    return { outcome: "not_found" };
  }
  if (tournament.format !== "mexicano") {
    return { outcome: "unsupported_format" };
  }

  const previousMatches = await prisma.tournamentMatch.findMany({ where: { tournamentId } });
  const lastRound = previousMatches.reduce((max, match) => Math.max(max, match.round), 0);

  if (lastRound > 0) {
    const stillUnscored = previousMatches.some(
      (match) => match.round === lastRound && (match.scoreA === null || match.scoreB === null),
    );
    if (stillUnscored) {
      return { outcome: "previous_round_incomplete" };
    }
  }
  if (lastRound >= tournament.roundCount) {
    return { outcome: "tournament_complete" };
  }
  if (tournament.players.length < 4) {
    return { outcome: "not_enough_players" };
  }

  const courts = await prisma.court.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" },
    take: tournament.courtCount,
  });
  if (courts.length === 0) {
    return { outcome: "no_courts_available" };
  }

  const timesPlayed = await countTimesPlayed(tournamentId);
  const sitOutCount = tournament.players.length % 4;
  const sittingOut = pickSitOuts(tournament.players, lastRound, timesPlayed, sitOutCount);
  const sittingOutIds = new Set(sittingOut.map((player) => player.id));
  const playing = tournament.players.filter((player) => !sittingOutIds.has(player.id));

  // Nobody has points yet on the very first round, so there is nothing
  // meaningful to rank by; a random order is the fairest starting point.
  // From the second round on, players are ranked by their running total.
  const newRound = lastRound + 1;
  const rankedPlayers =
    newRound === 1
      ? shuffle(playing)
      : [...playing].sort((a, b) => b.points - a.points || a.id - b.id);

  const matchups = pairIntoMatchups(rankedPlayers);

  const matches = await prisma.$transaction(async (tx) => {
    if (newRound === 1) {
      await tx.tournament.update({ where: { id: tournamentId }, data: { status: "active" } });
    }

    const created = [];
    for (const [index, matchup] of matchups.entries()) {
      const court = courts[index % courts.length];
      const match = await tx.tournamentMatch.create({
        data: { tournamentId, round: newRound, courtId: court.id },
      });
      await tx.tournamentMatchPlayer.createMany({
        data: [
          ...matchup.teamA.map((player) => ({
            matchId: match.id,
            tournamentPlayerId: player.id,
            team: "a",
          })),
          ...matchup.teamB.map((player) => ({
            matchId: match.id,
            tournamentPlayerId: player.id,
            team: "b",
          })),
        ],
      });
      created.push({
        id: match.id,
        round: match.round,
        courtId: match.courtId,
        teamA: matchup.teamA.map((player) => ({ id: player.id, displayName: player.displayName })),
        teamB: matchup.teamB.map((player) => ({ id: player.id, displayName: player.displayName })),
      });
    }
    return created;
  });

  return {
    outcome: "generated",
    round: newRound,
    matches,
    sitOutPlayerIds: sittingOut.map((player) => player.id),
  };
}
