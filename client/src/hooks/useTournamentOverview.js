import { useEffect, useState } from "react";
import { fetchTournamentOverview } from "../api/tournaments.js";

export function useTournamentOverview(id, pollIntervalMs) {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    function load() {
      fetchTournamentOverview(id)
        .then((data) => {
          if (!cancelled) {
            setOverview(data);
            setError("");
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setError(err.message);
          }
        });
    }

    load();
    if (!pollIntervalMs) {
      return () => {
        cancelled = true;
      };
    }

    const interval = setInterval(load, pollIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id, pollIntervalMs]);

  return { overview, error };
}
