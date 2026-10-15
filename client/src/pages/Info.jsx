import { Suspense, lazy } from "react";
import racketsPhoto from "../assets/photos/rackets-and-balls.jpg";
import { ADDRESS_LINES, DIRECTIONS_URL, OPENING_HOURS } from "../constants/business.js";

// Leaflet is a real dependency, not a one-off chunk like the hero's 3D ball,
// but it is still only needed on this page, so it stays a lazy import.
const ClubMap = lazy(() => import("../components/ClubMap.jsx"));

// Shown while the map's own chunk downloads, same markup as ClubMap's
// internal fallback so there is no visible swap between the two.
function MapPlaceholder() {
  return (
    <div className="flex h-[220px] w-full max-w-xs flex-col justify-center gap-2 rounded-lg border border-border bg-surface p-4">
      <p className="text-sm text-text">{ADDRESS_LINES.join(", ")}</p>
      <a href={DIRECTIONS_URL} className="text-sm text-accent hover:underline">
        Get directions
      </a>
    </div>
  );
}

export default function Info() {
  return (
    <>
      <section className="px-5 pb-8 pt-12 md:max-w-page md:pb-10 md:pl-24 md:pr-10 md:pt-16">
        <h1 className="mb-4 text-4xl tracking-tight md:text-5xl">Info</h1>
        <p className="max-w-[60ch] text-text-muted">Everything you need before you play.</p>
      </section>

      <section className="border-t border-border px-5 py-12 md:max-w-page md:py-16 md:pl-24 md:pr-10">
        <div className="grid gap-10 md:grid-cols-2 md:gap-16">
          <div className="flex flex-col gap-10">
            <div>
              <h2 className="mb-3 text-2xl">Opening hours</h2>
              <dl className="divide-y divide-border">
                {OPENING_HOURS.map(({ label, hours }) => (
                  <div key={label} className="flex items-baseline justify-between py-2">
                    <dt className="text-text-muted">{label}</dt>
                    <dd className="font-medium tabular-nums text-text">{hours}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              <h2 className="mb-3 text-2xl">Price</h2>
              <p className="numeral text-[clamp(2.5rem,7vw,3.75rem)] text-accent">
                400 <span className="text-[0.4em] font-medium text-text-muted">CZK</span>
              </p>
              <p className="mt-2 text-text-muted">
                Per hour, the same during the day and in the evening. You pay online when you book.
              </p>
            </div>
          </div>

          <img
            src={racketsPhoto}
            width="547"
            height="365"
            loading="lazy"
            alt="Two padel rackets leaning against each other with three yellow-green balls at their base, on a blue acrylic court, daylight, steel mesh fence and the clubhouse roof visible behind."
            className="h-auto w-full rounded-lg border border-border object-cover"
          />
        </div>
      </section>

      <section className="border-t border-border px-5 py-12 md:max-w-page md:py-16 md:pl-24 md:pr-10">
        {/* A fixed column width, not auto: the old SVG had its own
            intrinsic size from its viewBox for an auto column to pick up,
            the map's div does not, and auto collapsed it to nothing. */}
        <div className="grid gap-10 md:grid-cols-[20rem_1fr] md:items-start md:gap-16">
          <Suspense fallback={<MapPlaceholder />}>
            <ClubMap />
          </Suspense>
          <div>
            <h2 className="mb-3 text-2xl">How to find us</h2>
            <p className="max-w-[60ch] text-text-muted">
              GEN PADEL Rožnov is at {ADDRESS_LINES.join(", ")}. The courts are outdoor, a short
              walk from the town centre. Free parking is next to the courts.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-border px-5 py-12 md:max-w-page md:py-16 md:pl-24 md:pr-10">
        <h2 className="mb-3 text-2xl">Court rules</h2>
        <ul className="max-w-[60ch] space-y-2 text-text-muted">
          <li>Book online before you arrive. There is no reception at the courts.</li>
          <li>Each court fits up to 4 players.</li>
          <li>Wear shoes made for outdoor courts. Shoes with black soles are not allowed.</li>
          <li>No glass on the court.</li>
          <li className="text-text">
            Your gate code works only for your booked time. The lights turn off when your time ends.
          </li>
          <li>Please leave the court on time for the next booking.</li>
        </ul>
      </section>
    </>
  );
}
