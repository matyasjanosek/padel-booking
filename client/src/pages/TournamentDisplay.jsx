import { useParams } from "react-router-dom";
import { useTournamentOverview } from "../hooks/useTournamentOverview.js";

const POLL_INTERVAL_MS = 5000;

export default function TournamentDisplay() {
  const { id } = useParams();
  const { overview, error } = useTournamentOverview(id, POLL_INTERVAL_MS);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-10">
        <p className="text-3xl text-danger">{error}</p>
      </div>
    );
  }
  if (!overview) {
    return (
      <div className="flex min-h-screen items-center justify-center px-10">
        <p className="text-3xl text-text-muted">Loading...</p>
      </div>
    );
  }

  const { tournament, currentRound, isCurrentRoundComplete, matches, sitOutPlayers, standings } =
    overview;

  return (
    <div className="min-h-screen px-10 py-10">
      <header className="mb-10">
        <h1 className="font-heading text-5xl font-bold tracking-tight md:text-6xl">
          {tournament.name}
        </h1>
        <p className="mt-2 text-2xl text-text-muted">
          {currentRound > 0 ? `Round ${currentRound} of ${tournament.roundCount}` : "Starting soon"}
        </p>
      </header>

      <div className="grid gap-10 md:grid-cols-[3fr_2fr]">
        <div>
          <h2 className="mb-5 text-3xl">Matches</h2>
          {currentRound === 0 ? (
            <p className="text-2xl text-text-muted">The schedule has not started yet.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {matches.map((match) => (
                <div key={match.id} className="rounded-xl border border-border px-6 py-5">
                  <p className="text-xl text-text-muted">{match.courtName}</p>
                  <p className="mt-3 text-2xl font-medium leading-snug">
                    {match.teamA.map((player) => player.displayName).join(" & ")}
                  </p>
                  <p className="my-1 text-lg text-text-muted">vs</p>
                  <p className="text-2xl font-medium leading-snug">
                    {match.teamB.map((player) => player.displayName).join(" & ")}
                  </p>
                  {match.scoreA !== null && (
                    <p className="mt-4 text-center font-heading text-4xl text-accent">
                      {match.scoreA} &ndash; {match.scoreB}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          {sitOutPlayers.length > 0 && (
            <p className="mt-5 text-xl text-text-muted">
              Sitting out: {sitOutPlayers.map((player) => player.displayName).join(", ")}
            </p>
          )}
          {isCurrentRoundComplete && tournament.status !== "finished" && (
            <p className="mt-6 text-2xl text-text-muted">Round {currentRound + 1} is next.</p>
          )}
          {tournament.status === "finished" && (
            <p className="mt-6 text-3xl font-medium text-accent">Tournament finished.</p>
          )}
        </div>

        <div>
          <h2 className="mb-5 text-3xl">Standings</h2>
          <table className="w-full border-collapse text-left text-xl">
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th className="py-2 pr-4 font-normal">#</th>
                <th className="py-2 pr-4 font-normal">Player</th>
                <th className="py-2 font-normal">Points</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((player) => (
                <tr key={player.id} className="border-b border-border/60">
                  <td className="py-3 pr-4 text-text-muted">{player.rank}</td>
                  <td className="py-3 pr-4 font-medium">{player.displayName}</td>
                  <td className="py-3 font-medium text-accent">{player.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
