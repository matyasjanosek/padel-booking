import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  fetchTournamentOverview,
  registerPlayer,
  removePlayer,
  generateNextRound,
  recordScore,
} from "../api/tournaments.js";
import { fetchAdminUsers } from "../api/adminUsers.js";

const FORMAT_LABELS = {
  americano: "Americano",
  mexicano: "Mexicano",
  round_robin: "Round robin",
};
const STATUS_LABELS = {
  draft: "Draft",
  active: "Active",
  finished: "Finished",
};

// Every registered player, whether they are playing this round or sitting
// it out. The overview has no single "all players" field, this is the two
// parts of it that together always add up to the full roster.
function allPlayers(overview) {
  const playing = overview.matches.flatMap((match) => [...match.teamA, ...match.teamB]);
  return [...playing, ...overview.sitOutPlayers];
}

// A team's score and the other team's are always the other side of the
// same points total, Mexicano is played to a fixed number of points. So
// moving one stepper sets the other team's score too, there is no way to
// end up with a total that does not add up, and no second number to enter.
function scoreAfterChange(team, value, pointsPerMatch) {
  const clamped = Math.max(0, Math.min(pointsPerMatch, value));
  const other = pointsPerMatch - clamped;
  return team === "a" ? { scoreA: clamped, scoreB: other } : { scoreA: other, scoreB: clamped };
}

function Stepper({ value, onChange, disabled }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= 0}
        className="h-12 w-12 rounded-full border border-border text-2xl font-medium text-text disabled:opacity-30"
      >
        &minus;
      </button>
      <span className="w-10 text-center font-heading text-2xl text-text">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={disabled}
        className="h-12 w-12 rounded-full border border-border text-2xl font-medium text-text disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}

function MatchScoreCard({ match, pointsPerMatch, draft, onChange, onSave, saving, error }) {
  const hasScore = match.scoreA !== null;
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-sm text-text-muted">{match.courtName}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="font-medium text-text">
          {match.teamA.map((player) => player.displayName).join(" & ")}
        </span>
        <Stepper
          value={draft.scoreA}
          onChange={(value) => onChange(scoreAfterChange("a", value, pointsPerMatch))}
          disabled={saving}
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="font-medium text-text">
          {match.teamB.map((player) => player.displayName).join(" & ")}
        </span>
        <Stepper
          value={draft.scoreB}
          onChange={(value) => onChange(scoreAfterChange("b", value, pointsPerMatch))}
          disabled={saving}
        />
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="mt-3 w-full rounded-full border border-accent bg-accent py-2.5 font-medium text-bg disabled:opacity-50"
      >
        {saving ? "Saving..." : hasScore ? "Update score" : "Save score"}
      </button>
    </div>
  );
}

export default function AdminTournamentDetail() {
  const { id } = useParams();

  const [overview, setOverview] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [members, setMembers] = useState([]);

  const [registerMode, setRegisterMode] = useState("member");
  const [memberUserId, setMemberUserId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [registering, setRegistering] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [playerError, setPlayerError] = useState("");

  const [generating, setGenerating] = useState(false);
  const [roundError, setRoundError] = useState("");

  const [scores, setScores] = useState({});
  const [savingMatchId, setSavingMatchId] = useState(null);
  const [scoreErrors, setScoreErrors] = useState({});

  const reload = useCallback(
    () =>
      fetchTournamentOverview(id)
        .then((data) => {
          setOverview(data);
          setLoadError("");
        })
        .catch((err) => setLoadError(err.message)),
    [id],
  );

  useEffect(() => {
    reload();
    fetchAdminUsers()
      .then(setMembers)
      .catch(() => {});
  }, [reload]);

  async function handleRegister(event) {
    event.preventDefault();
    setRegistering(true);
    setPlayerError("");
    try {
      // A newly registered player is not in any match yet, whether or not
      // a round already exists, so they belong in sitOutPlayers either way.
      // That is enough to show them in the list straight away, without a
      // full reload just to see one new name.
      const player = await registerPlayer(
        id,
        registerMode === "member" ? { userId: memberUserId } : { displayName: guestName },
      );
      setOverview((current) => ({
        ...current,
        sitOutPlayers: [
          ...current.sitOutPlayers,
          { id: player.id, displayName: player.displayName },
        ],
      }));
      setMemberUserId("");
      setGuestName("");
    } catch (err) {
      setPlayerError(err.message);
    } finally {
      setRegistering(false);
    }
  }

  async function handleRemove(player) {
    setRemovingId(player.id);
    setPlayerError("");
    try {
      await removePlayer(id, player.id);
      setOverview((current) => ({
        ...current,
        sitOutPlayers: current.sitOutPlayers.filter((p) => p.id !== player.id),
      }));
    } catch (err) {
      setPlayerError(err.message);
    } finally {
      setRemovingId(null);
    }
  }

  async function handleGenerateRound() {
    setGenerating(true);
    setRoundError("");
    try {
      await generateNextRound(id);
      await reload();
    } catch (err) {
      setRoundError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  function draftFor(match, pointsPerMatch) {
    if (scores[match.id]) {
      return scores[match.id];
    }
    if (match.scoreA !== null) {
      return { scoreA: match.scoreA, scoreB: match.scoreB };
    }
    return { scoreA: 0, scoreB: pointsPerMatch };
  }

  async function handleSaveScore(match) {
    const draft = draftFor(match, overview.tournament.pointsPerMatch);
    setSavingMatchId(match.id);
    setScoreErrors((current) => ({ ...current, [match.id]: "" }));
    try {
      await recordScore(id, match.id, draft);
      await reload();
    } catch (err) {
      setScoreErrors((current) => ({ ...current, [match.id]: err.message }));
    } finally {
      setSavingMatchId(null);
    }
  }

  if (loadError) {
    return (
      <section className="px-5 py-12 md:max-w-page md:pl-24 md:pr-10 md:py-16">
        <p className="text-sm text-danger">{loadError}</p>
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
  const players = allPlayers(overview);
  const canRemovePlayers = tournament.status === "draft";

  return (
    <section className="px-5 py-12 md:max-w-page md:pl-24 md:pr-10 md:py-16">
      <p className="mb-2 text-sm text-text-muted">
        <Link to="/admin/tournaments" className="hover:text-text">
          Tournaments
        </Link>
      </p>
      <h1 className="mb-1 text-4xl tracking-tight md:text-5xl">{tournament.name}</h1>
      <p className="mb-8 text-text-muted">
        {FORMAT_LABELS[tournament.format]}, played to {tournament.pointsPerMatch} points ·{" "}
        {STATUS_LABELS[tournament.status]}
        {currentRound > 0 && ` · Round ${currentRound} of ${tournament.roundCount}`}
      </p>

      <h2 className="mb-3 text-2xl">Players</h2>
      <form
        onSubmit={handleRegister}
        className="mb-5 flex flex-wrap items-end gap-3 rounded-lg border border-border p-4"
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="register-mode">
            Register
          </label>
          <select
            id="register-mode"
            value={registerMode}
            onChange={(event) => setRegisterMode(event.target.value)}
            className="rounded-lg border border-border bg-bg px-3 py-2 text-text"
          >
            <option value="member">A member</option>
            <option value="guest">A guest</option>
          </select>
        </div>
        {registerMode === "member" ? (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="register-member">
              Member
            </label>
            <select
              id="register-member"
              value={memberUserId}
              onChange={(event) => setMemberUserId(event.target.value)}
              className="rounded-lg border border-border bg-bg px-3 py-2 text-text"
              required
            >
              <option value="" disabled>
                Choose a member
              </option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="register-guest">
              Guest name
            </label>
            <input
              id="register-guest"
              type="text"
              value={guestName}
              onChange={(event) => setGuestName(event.target.value)}
              className="rounded-lg border border-border bg-bg px-3 py-2 text-text"
              required
            />
          </div>
        )}
        <button
          type="submit"
          disabled={registering}
          className="rounded-full border border-accent bg-accent px-5 py-2 font-medium text-bg disabled:opacity-50"
        >
          {registering ? "Registering..." : "Register"}
        </button>
      </form>

      {playerError && <p className="mb-4 text-sm text-danger">{playerError}</p>}

      {players.length === 0 ? (
        <p className="mb-10 text-text-muted">No players registered yet.</p>
      ) : (
        <ul className="mb-10 flex flex-col gap-2">
          {players.map((player) => (
            <li
              key={player.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-2"
            >
              <span className="text-text">{player.displayName}</span>
              {canRemovePlayers ? (
                <button
                  type="button"
                  onClick={() => handleRemove(player)}
                  disabled={removingId === player.id}
                  className="rounded-full border border-border px-3 py-1 text-sm font-medium text-text transition-colors duration-200 hover:border-accent hover:text-accent disabled:opacity-50"
                >
                  {removingId === player.id ? "Removing..." : "Remove"}
                </button>
              ) : (
                <span className="text-sm text-text-muted">Locked once started</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-3 text-2xl">Current round</h2>
      {currentRound === 0 ? (
        <button
          type="button"
          onClick={handleGenerateRound}
          disabled={generating}
          className="rounded-full border border-accent bg-accent px-6 py-2.5 font-medium text-bg disabled:opacity-50"
        >
          {generating ? "Generating..." : "Generate round 1"}
        </button>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {matches.map((match) => (
              <MatchScoreCard
                key={match.id}
                match={match}
                pointsPerMatch={tournament.pointsPerMatch}
                draft={draftFor(match, tournament.pointsPerMatch)}
                onChange={(next) => setScores((current) => ({ ...current, [match.id]: next }))}
                onSave={() => handleSaveScore(match)}
                saving={savingMatchId === match.id}
                error={scoreErrors[match.id]}
              />
            ))}
          </div>
          {sitOutPlayers.length > 0 && (
            <p className="mt-3 text-sm text-text-muted">
              Sitting out this round: {sitOutPlayers.map((player) => player.displayName).join(", ")}
            </p>
          )}
          {tournament.status === "finished" && (
            <p className="mt-4 font-medium text-accent">This tournament is finished.</p>
          )}
          {isCurrentRoundComplete && tournament.status !== "finished" && (
            <button
              type="button"
              onClick={handleGenerateRound}
              disabled={generating}
              className="mt-4 rounded-full border border-accent bg-accent px-6 py-2.5 font-medium text-bg disabled:opacity-50"
            >
              {generating ? "Generating..." : `Generate round ${currentRound + 1}`}
            </button>
          )}
          {!isCurrentRoundComplete && (
            <p className="mt-4 text-text-muted">Waiting for every match to have a score.</p>
          )}
        </>
      )}
      {roundError && <p className="mt-3 text-sm text-danger">{roundError}</p>}

      <h2 className="mb-3 mt-10 text-2xl">Standings</h2>
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
    </section>
  );
}
