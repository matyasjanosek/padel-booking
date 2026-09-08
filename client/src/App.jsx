import { useEffect, useState } from "react";
import { fetchCourts } from "./api/courts.js";
import Hero from "./components/Hero.jsx";

export default function App() {
  const [courts, setCourts] = useState([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchCourts()
      .then(setCourts)
      .catch(() => setError(true));
  }, []);

  return (
    <>
      <Hero />
      <section className="border-t border-border px-5 pb-16 pt-12 md:max-w-page md:pl-24 md:pr-10">
        <h2 className="mb-3 text-2xl">The courts</h2>
        <p className="mb-6 max-w-[46ch] text-text-muted">
          Both courts are outdoor and have floodlights. You can book either one.
        </p>
        {error ? (
          <p>The courts could not be loaded right now.</p>
        ) : (
          <ul className="flex flex-wrap gap-3">
            {courts.map((court) => (
              <li
                key={court.id}
                className="rounded-lg border border-border px-4 py-2.5 font-heading font-bold"
              >
                {court.name}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
