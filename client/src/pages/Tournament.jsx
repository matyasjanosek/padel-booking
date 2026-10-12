import { useParams } from "react-router-dom";
import { useTournamentOverview } from "../hooks/useTournamentOverview.js";

const FORMAT_LABELS = {
  americano: "Americano",
  mexicano: "Mexicano",
  round_robin: "Round robin",
};

function MatchCard({ match }) {
  const hasScore = match.scoreA !== null && match.scoreB !== null;
  return (
    <div className="rounded-lg border border-border px-4 py-3">
      <p className="text-sm text-text-muted">{match.courtName}</p>
      <div className="mt-1 flex items-center justify-between gap-3">
        <span className="font-medium text-text">
          {match.teamA.map((player) => player.displayName).join(" & ")}
        </span>
        <span className="text-sm text-text-muted">vs</span>
        <span className="font-medium text-text">
          {match.teamB.map((player) => player.displayName).join(" & ")}
        </span>
      </div>
      {hasScore && (
        <p className="mt-1 text-center font-heading text-lg text-accent">
          {match.scoreA} &ndash; {match.scoreB}
        </p>
      )}
    </div>
  );
}

function Standings({ standings }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-left">
        <thead>
          <tr className="border-b border-border text-sm text-text-muted">
            <th className="py-2 pr-3 font-normal">#</th>
            <th className="py-2 pr-3 font-normal">Player</th>
            <th className="py-2 pr-3 font-normal">Points</th>
            <th className="py-2 pr-3 font-normal">Played</th>
            <th className="py-2 font-normal">+/-</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((player) => (
            <tr key={player.id} className="border-b border-border/60">
              <td className="py-2 pr-3 text-text-muted">{player.rank}</td>
              <td className="py-2 pr-3 font-medium text-text">{player.displayName}</td>
              <td className="py-2 pr-3 text-text">{player.points}</td>
              <td className="py-2 pr-3 text-text-muted">{player.matchesPlayed}</td>
              <td className="py-2 text-text-muted">
                {player.pointsDifference > 0 ? "+" : ""}
                {player.pointsDifference}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Tournament() {
  const { id } = useParams();
  const { overview, error } = useTournamentOverview(id);

  if (error) {
    return (
      <section className="px-5 py-12 md:max-w-page md:pl-24 md:pr-10 md:py-16">
        <p className="text-sm text-danger">{error}</p>
      </section>
    );
  }
  if (!overview) {
    return (
      <section className="px-5 py-12 md:max-w-page md:pl-24 md:pr-10 md:py-16">
        <p className="text-text-muted">Loading tournament...</p>
      </section>
    );
  }

  const { tournament, currentRound, isCurrentRoundComplete, matches, sitOutPlayers, standings } =
    overview;

  return (
    <section className="px-5 py-12 md:max-w-page md:pl-24 md:pr-10 md:py-16">
      <h1 className="mb-1 text-4xl tracking-tight md:text-5xl">{tournament.name}</h1>
      <p className="mb-8 text-text-muted">
        {FORMAT_LABELS[tournament.format]}, played to {tournament.pointsPerMatch} points
        {currentRound > 0 && ` · Round ${currentRound} of ${tournament.roundCount}`}
      </p>

      <h2 className="mb-3 text-2xl">Current round</h2>
      {currentRound === 0 ? (
        <p className="text-text-muted">The schedule has not started yet.</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {matches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
          {sitOutPlayers.length > 0 && (
            <p className="mt-3 text-sm text-text-muted">
              Sitting out this round: {sitOutPlayers.map((player) => player.displayName).join(", ")}
            </p>
          )}
          {isCurrentRoundComplete && tournament.status !== "finished" && (
            <p className="mt-4 text-text-muted">
              Round {currentRound} is finished. Round {currentRound + 1} is next.
            </p>
          )}
          {tournament.status === "finished" && (
            <p className="mt-4 font-medium text-accent">This tournament is finished.</p>
          )}
        </>
      )}

      <h2 className="mb-3 mt-10 text-2xl">Standings</h2>
      <Standings standings={standings} />
    </section>
  );
}
