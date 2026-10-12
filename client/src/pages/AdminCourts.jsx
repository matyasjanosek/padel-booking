import { useEffect, useState } from "react";
import { fetchAdminCourts, renameCourt, setCourtActive } from "../api/adminCourts.js";

export default function AdminCourts() {
  const [courts, setCourts] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [nameDraft, setNameDraft] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    fetchAdminCourts()
      .then(setCourts)
      .catch((err) => setError(err.message));
  }, []);

  function startEditing(court) {
    setEditingId(court.id);
    setNameDraft(court.name);
    setError("");
    setNotice("");
  }

  async function handleRename(id) {
    setSavingId(id);
    setError("");
    try {
      const updated = await renameCourt(id, nameDraft);
      setCourts((current) => current.map((court) => (court.id === id ? updated : court)));
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  async function handleToggleActive(court) {
    setTogglingId(court.id);
    setError("");
    setNotice("");
    try {
      const result = await setCourtActive(court.id, !court.isActive);
      setCourts((current) => current.map((c) => (c.id === court.id ? result.court : c)));
      if (!result.court.isActive && result.futureConfirmedBookings > 0) {
        const count = result.futureConfirmedBookings;
        setNotice(
          `${result.court.name} is now inactive. It still has ${count} confirmed booking${count === 1 ? "" : "s"} in the future. Those bookings were not changed, reschedule or cancel them from Bookings if needed.`,
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <section className="px-5 py-12 md:max-w-page md:pl-24 md:pr-10 md:py-16">
      <h1 className="mb-4 text-4xl tracking-tight md:text-5xl">Courts</h1>
      <p className="mb-8 max-w-[60ch] text-text-muted">
        Rename a court, or take it out of service without touching its existing bookings.
      </p>

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}
      {notice && <p className="mb-4 max-w-[60ch] text-sm text-accent">{notice}</p>}

      {courts === null ? (
        <p className="text-text-muted">Loading courts...</p>
      ) : (
        <ul className="flex max-w-xl flex-col gap-3">
          {courts.map((court) => (
            <li key={court.id} className="rounded-lg border border-border px-4 py-3">
              {editingId === court.id ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={nameDraft}
                    onChange={(event) => setNameDraft(event.target.value)}
                    className="rounded-lg border border-border bg-bg px-3 py-1.5 text-text"
                  />
                  <button
                    type="button"
                    onClick={() => handleRename(court.id)}
                    disabled={savingId === court.id}
                    className="rounded-full border border-accent bg-accent px-4 py-1.5 text-sm font-medium text-bg disabled:opacity-50"
                  >
                    {savingId === court.id ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    disabled={savingId === court.id}
                    className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-text transition-colors duration-200 hover:border-accent hover:text-accent disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-text">{court.name}</p>
                    <p className="text-sm text-text-muted">
                      {court.isActive ? "Active" : "Inactive"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEditing(court)}
                      className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-text transition-colors duration-200 hover:border-accent hover:text-accent"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(court)}
                      disabled={togglingId === court.id}
                      className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-text transition-colors duration-200 hover:border-accent hover:text-accent disabled:opacity-50"
                    >
                      {togglingId === court.id
                        ? "Saving..."
                        : court.isActive
                          ? "Deactivate"
                          : "Activate"}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
