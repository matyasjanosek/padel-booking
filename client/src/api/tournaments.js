export async function fetchTournamentOverview(id) {
  const res = await fetch(`/api/tournaments/${id}/overview`);
  if (!res.ok) {
    throw new Error("This tournament could not be loaded");
  }
  return res.json();
}
