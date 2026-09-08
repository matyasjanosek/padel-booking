import { useEffect, useState } from "react";
import { fetchCourts } from "./api/courts.js";
import Hero from "./components/Hero.jsx";
import "./styles/home.css";

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
      <section className="courts">
        <h2 className="courts-title">The courts</h2>
        <p className="courts-note">
          Both courts are outdoor and have floodlights. You can book either one.
        </p>
        {error ? (
          <p>The courts could not be loaded right now.</p>
        ) : (
          <ul className="courts-list">
            {courts.map((court) => (
              <li key={court.id}>{court.name}</li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
