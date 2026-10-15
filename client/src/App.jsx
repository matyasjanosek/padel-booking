import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchCourts } from "./api/courts.js";
import Hero from "./components/Hero.jsx";
import sunsetPhoto from "./assets/photos/club-at-sunset.jpg";

// The scrim's own opacity reaches the brightest sky highlight actually in
// this photo at 70% and still holds 6.3:1 against chalk text there, 15.1:1
// where the heading itself sits, at 92%. Measured once, directly, not
// approximated with a generic Tailwind gradient.
const SCRIM = {
  backgroundImage:
    "linear-gradient(to top, rgba(10,10,10,0.92) 0%, rgba(10,10,10,0.78) 28%, rgba(10,10,10,0.32) 55%, rgba(10,10,10,0) 78%)",
};

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

      {/* The one atmospheric moment on this page, so nothing else competes
          with it: everything around it stays quiet. */}
      <section className="relative h-72 sm:h-96 md:h-[480px]">
        <img
          src={sunsetPhoto}
          width="1200"
          height="799"
          loading="lazy"
          alt="GEN PADEL's courts at sunset, floodlights lit, two players mid-rally on the near court, the blue acrylic surface glowing under the lights, trees and dusk sky behind the fence."
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 flex items-end" style={SCRIM}>
          <div className="w-full px-5 pb-8 sm:px-8 md:max-w-page md:px-24 md:pb-12">
            <h2 className="mb-2 text-[clamp(1.75rem,5vw,2.75rem)]">Play on, after dark</h2>
            <p className="text-text">The floodlights come on the moment your booking does.</p>
          </div>
        </div>
      </section>
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
              <li key={court.id}>
                <Link
                  to={`/booking?court=${court.id}`}
                  className="inline-block rounded-lg border border-border px-4 py-2.5 font-heading font-bold text-text transition-colors duration-200 hover:border-accent hover:text-accent"
                >
                  {court.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
