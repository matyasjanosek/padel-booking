import racketsPhoto from "../assets/photos/rackets-and-balls.jpg";
import Ticker from "../components/Ticker.jsx";
import { ADDRESS_LINES, MAP_EMBED_URL, OPENING_HOURS } from "../constants/business.js";

const RULES = [
  {
    icon: LockIcon,
    text: "Your gate code works only for your booked time. The lights turn off when your time ends.",
    important: true,
  },
  {
    icon: CalendarIcon,
    text: "Book online before you arrive. There is no reception at the courts.",
  },
  { icon: PeopleIcon, text: "Each court fits up to 4 players." },
  {
    icon: ShoeIcon,
    text: "Wear shoes made for outdoor courts. Shoes with black soles are not allowed.",
  },
  { icon: GlassIcon, text: "No glass on the court." },
  { icon: ClockIcon, text: "Please leave the court on time for the next booking." },
];

function LockIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 9.5h16" />
      <path d="M8 3v3.5M16 3v3.5" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6" />
      <path d="M18 8v5M15.5 10.5h5" />
    </svg>
  );
}

function ShoeIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 16.5c0-1 .7-1.8 1.7-2.1l5-1.5c.8-1.6 2.4-2.9 4.3-2.9.6 0 1 .4 1 1v1.2c1.6.3 3 1.5 3.6 3.1H21a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}

function GlassIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 4h10l-1.3 13.5a2 2 0 0 1-2 1.8h-3.4a2 2 0 0 1-2-1.8L7 4z" />
      <path d="M8 8h8" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function RulePanel({ icon: Icon, text, important }) {
  return (
    <li
      className={`rounded-[22px] border bg-surface p-6 ${important ? "border-accent" : "border-border"}`}
    >
      <span
        className={`flex size-10 items-center justify-center rounded-xl ${
          important ? "bg-accent text-bg" : "bg-accent-dim text-accent"
        }`}
      >
        <Icon />
      </span>
      <p className="mt-4 text-text-muted">{text}</p>
    </li>
  );
}

export default function Info() {
  return (
    <>
      <section className="px-5 py-8 md:max-w-page md:py-8 md:pl-24 md:pr-10">
        <h1 className="display-heading flex flex-col text-[clamp(2.5rem,7.4vw,8.875rem)] leading-[0.92] tracking-[-0.03em]">
          <span>INFO</span>
          <span className="mt-[0.12em] text-transparent [-webkit-text-stroke:2px_var(--color-text)]">
            GEN PADEL
          </span>
        </h1>
        <p className="mt-6 max-w-[60ch] text-text-muted">Everything you need before you play.</p>
      </section>

      <section className="px-5 py-16 md:max-w-page md:px-24 md:py-20">
        <div className="grid gap-10 md:grid-cols-2 md:gap-16">
          <div className="flex flex-col gap-10">
            <div>
              <h2 className="font-body text-[13px] font-normal uppercase tracking-[0.08em] text-text-muted">
                Opening hours
              </h2>
              <dl className="mt-3 divide-y divide-border">
                {OPENING_HOURS.map(({ label, hours }) => (
                  <div key={label} className="flex items-baseline justify-between py-3">
                    <dt className="text-text-muted">{label}</dt>
                    <dd className="font-medium tabular-nums text-text">{hours}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              <h2 className="font-body text-[13px] font-normal uppercase tracking-[0.08em] text-text-muted">
                Price
              </h2>
              <p className="numeral mt-3 flex items-baseline gap-3 text-[clamp(3.5rem,9vw,5.5rem)] text-hero-accent">
                400
                <span className="flex items-baseline gap-1.5 text-[0.32em] font-medium normal-case tracking-normal text-text-muted">
                  <span>CZK</span>
                  <span>/ HOUR</span>
                </span>
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
            className="h-full w-full rounded-[22px] border border-border object-cover"
          />
        </div>
      </section>

      <section className="px-5 py-16 md:max-w-page md:px-24 md:py-20">
        <div className="grid gap-6 md:grid-cols-2 md:gap-16">
          <h2 className="text-2xl md:text-3xl">How to find us</h2>
          <p className="max-w-[60ch] text-text-muted">
            GEN PADEL Rožnov is at {ADDRESS_LINES.join(", ")}. The courts are outdoor, a short walk
            from the town centre. Free parking is next to the courts.
          </p>
        </div>
        <iframe
          src={MAP_EMBED_URL}
          title="Map showing GEN PADEL Rožnov"
          loading="lazy"
          className="map-embed mt-10 h-[420px] w-full rounded-[22px] border border-border"
        />
      </section>

      <section className="px-5 py-16 md:max-w-page md:px-24 md:py-20">
        <h2 className="font-body text-[13px] font-normal uppercase tracking-[0.08em] text-text-muted">
          Court rules
        </h2>
        <ul className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          {RULES.map((rule) => (
            <RulePanel key={rule.text} {...rule} />
          ))}
        </ul>
      </section>

      <Ticker />
    </>
  );
}
