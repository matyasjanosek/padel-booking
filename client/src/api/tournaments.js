export async function fetchTournamentOverview(id) {
  const res = await fetch(`/api/tournaments/${id}/overview`);
  if (!res.ok) {
    throw new Error("This tournament could not be loaded");
  }
  return res.json();
}

async function parseJsonOrThrow(res) {
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error || "Something went wrong");
  }
  return body;
}

export async function fetchAdminTournaments() {
  const res = await fetch("/api/tournaments");
  return parseJsonOrThrow(res);
}

export async function createTournament(tournament) {
  const res = await fetch("/api/tournaments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tournament),
  });
  return parseJsonOrThrow(res);
}

export async function registerPlayer(tournamentId, player) {
  const res = await fetch(`/api/tournaments/${tournamentId}/players`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(player),
  });
  return parseJsonOrThrow(res);
}

export async function removePlayer(tournamentId, playerId) {
  const res = await fetch(`/api/tournaments/${tournamentId}/players/${playerId}`, {
    method: "DELETE",
  });
  return parseJsonOrThrow(res);
}

export async function generateNextRound(tournamentId) {
  const res = await fetch(`/api/tournaments/${tournamentId}/rounds`, { method: "POST" });
  return parseJsonOrThrow(res);
}

export async function recordScore(tournamentId, matchId, score) {
  const res = await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(score),
  });
  return parseJsonOrThrow(res);
}
