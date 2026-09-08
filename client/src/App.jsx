import { useEffect, useState } from "react";
import { fetchCourts } from "./api/courts.js";

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
      <h1>Padel Centre</h1>
      <h2>Our courts</h2>
      {error ? (
        <p>Could not load courts.</p>
      ) : (
        <ul>
          {courts.map((court) => (
            <li key={court.id}>{court.name}</li>
          ))}
        </ul>
      )}
    </>
  );
}
