import racketsPhoto from "../assets/photos/rackets-and-balls.jpg";
import { ADDRESS_LINES, OPENING_HOURS } from "../constants/business.js";

// A schematic, not a map: the two courts, the fence around them, the gate
// members let themselves in through, and where to park. Real proportions,
// not a literal survey.
function SitePlan() {
  return (
    <svg
      viewBox="0 0 320 220"
      className="h-auto w-full max-w-xs"
      role="img"
      aria-label="Site plan: two courts side by side inside the fence, the gate on the near side, parking next to it."
    >
      <rect
        x="4"
        y="4"
        width="312"
        height="212"
        rx="4"
        fill="none"
        stroke="var(--color-border)"
        strokeWidth="2"
        strokeDasharray="3 4"
      />
      <rect
        x="24"
        y="24"
        width="126"
        height="172"
        rx="4"
        fill="var(--color-surface)"
        stroke="var(--color-accent)"
        strokeWidth="1.5"
      />
      <rect
        x="170"
        y="24"
        width="126"
        height="172"
        rx="4"
        fill="var(--color-surface)"
        stroke="var(--color-accent)"
        strokeWidth="1.5"
      />
      <text
        x="87"
        y="115"
        textAnchor="middle"
        fill="var(--color-text)"
        fontSize="14"
        fontFamily="Poppins, sans-serif"
        fontWeight="500"
      >
        Court 1
      </text>
      <text
        x="233"
        y="115"
        textAnchor="middle"
        fill="var(--color-text)"
        fontSize="14"
        fontFamily="Poppins, sans-serif"
        fontWeight="500"
      >
        Court 2
      </text>
      {/* Gate: a break in the boundary, bottom centre. */}
      <rect
        x="146"
        y="206"
        width="28"
        height="8"
        fill="var(--color-bg)"
        stroke="var(--color-accent)"
        strokeWidth="2"
      />
      <text
        x="160"
        y="195"
        textAnchor="middle"
        fill="var(--color-text-muted)"
        fontSize="11"
        fontFamily="Poppins, sans-serif"
      >
        Gate
      </text>
      <text
        x="160"
        y="24"
        textAnchor="middle"
        fill="var(--color-text-muted)"
        fontSize="11"
        fontFamily="Poppins, sans-serif"
      >
        Parking next to the courts
      </text>
    </svg>
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
        <div className="grid gap-10 md:grid-cols-[auto_1fr] md:items-start md:gap-16">
          <SitePlan />
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
