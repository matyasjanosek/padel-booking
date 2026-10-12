import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAdminTournaments, createTournament } from "../api/tournaments.js";

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

const EMPTY_FORM = {
  name: "",
  format: "mexicano",
  pointsPerMatch: "",
  courtCount: "",
  roundCount: "",
};

export default function AdminTournaments() {
  const [tournaments, setTournaments] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchAdminTournaments()
      .then(setTournaments)
      .catch((err) => setLoadError(err.message));
  }, []);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleCreate(event) {
    event.preventDefault();
    setCreating(true);
    setFormError("");
    try {
      const created = await createTournament(form);
      setTournaments((current) => [created, ...current]);
      setForm(EMPTY_FORM);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="px-5 py-12 md:max-w-page md:pl-24 md:pr-10 md:py-16">
      <h1 className="mb-4 text-4xl tracking-tight md:text-5xl">Tournaments</h1>
      <p className="mb-8 max-w-[60ch] text-text-muted">
        Create a tournament, then open it to register players, run rounds and enter scores.
      </p>

      <form
        onSubmit={handleCreate}
        className="mb-10 flex max-w-xl flex-col gap-4 rounded-lg border border-border p-5"
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="tournament-name">
            Name
          </label>
          <input
            id="tournament-name"
            type="text"
            value={form.name}
            onChange={(event) => updateForm("name", event.target.value)}
            className="rounded-lg border border-border bg-bg px-3 py-2 text-text"
            required
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="tournament-format">
              Format
            </label>
            <select
              id="tournament-format"
              value={form.format}
              onChange={(event) => updateForm("format", event.target.value)}
              className="rounded-lg border border-border bg-bg px-3 py-2 text-text"
            >
              <option value="mexicano">Mexicano</option>
              <option value="americano">Americano</option>
              <option value="round_robin">Round robin</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="tournament-points">
              Points per match
            </label>
            <input
              id="tournament-points"
              type="number"
              step="1"
              min="1"
              value={form.pointsPerMatch}
              onChange={(event) => updateForm("pointsPerMatch", event.target.value)}
              className="rounded-lg border border-border bg-bg px-3 py-2 text-text"
              required
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="tournament-courts">
              Courts to use
            </label>
            <input
              id="tournament-courts"
              type="number"
              step="1"
              min="1"
              value={form.courtCount}
              onChange={(event) => updateForm("courtCount", event.target.value)}
              className="rounded-lg border border-border bg-bg px-3 py-2 text-text"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="tournament-rounds">
              Number of rounds
            </label>
            <input
              id="tournament-rounds"
              type="number"
              step="1"
              min="1"
              value={form.roundCount}
              onChange={(event) => updateForm("roundCount", event.target.value)}
              className="rounded-lg border border-border bg-bg px-3 py-2 text-text"
              required
            />
          </div>
        </div>

        {formError && <p className="text-sm text-danger">{formError}</p>}

        <button
          type="submit"
          disabled={creating}
          className="mt-1 inline-block self-start rounded-full border border-accent bg-accent px-6 py-2.5 font-medium text-bg transition-opacity duration-200 disabled:opacity-50"
        >
          {creating ? "Creating..." : "Create tournament"}
        </button>
      </form>

      {loadError && <p className="mb-4 text-sm text-danger">{loadError}</p>}

      {tournaments === null ? (
        <p className="text-text-muted">Loading tournaments...</p>
      ) : tournaments.length === 0 ? (
        <p className="text-text-muted">No tournaments yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border text-sm text-text-muted">
                <th className="py-2 pr-3 font-normal">Name</th>
                <th className="py-2 pr-3 font-normal">Format</th>
                <th className="py-2 pr-3 font-normal">Status</th>
                <th className="py-2 font-normal">Manage</th>
              </tr>
            </thead>
            <tbody>
              {tournaments.map((tournament) => (
                <tr key={tournament.id} className="border-b border-border/60">
                  <td className="py-3 pr-3 font-medium text-text">{tournament.name}</td>
                  <td className="py-3 pr-3 text-text-muted">{FORMAT_LABELS[tournament.format]}</td>
                  <td className="py-3 pr-3 text-text-muted">{STATUS_LABELS[tournament.status]}</td>
                  <td className="py-3">
                    <Link
                      to={`/admin/tournaments/${tournament.id}`}
                      className="font-medium text-accent hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
