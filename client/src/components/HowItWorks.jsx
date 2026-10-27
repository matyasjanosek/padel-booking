const STEPS = [
  {
    title: "Pick a time",
    body: "Choose a court and a start time. Bookings run from one hour and go up in 30 minute steps. You see live availability, so a slot you can click is a slot you can get.",
    icon: CalendarIcon,
  },
  {
    title: "Pay online",
    body: "You pay by card when you book. The slot is held for you while you pay, so nobody can take it from under you.",
    icon: CardIcon,
  },
  {
    title: "Walk straight on",
    body: "Your gate code arrives by email right after payment. The floodlights switch on for your booked time. There is no reception and nobody to wait for.",
    icon: DoorIcon,
  },
];

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
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

function CardIcon() {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 14h4" />
    </svg>
  );
}

function DoorIcon() {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 21V4a1 1 0 0 1 1-1h8.5L19 5.5V21" />
      <path d="M3 21h18" />
      <circle cx="13.5" cy="12" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Three steps, connected by a thin line behind the icons on desktop; the
// line is a sibling of the ol (not inside it) so the markup stays valid.
export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 border-t border-border px-5 py-16 md:max-w-page md:px-24 md:py-20"
    >
      <h2 className="mb-10 text-2xl md:mb-14 md:text-3xl">How it works</h2>
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 right-0 top-6 hidden h-px bg-border md:block"
        />
        <ol className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map(({ title, body, icon: Icon }) => (
            <li key={title}>
              <span className="relative flex size-12 items-center justify-center rounded-full border border-border bg-bg text-accent">
                <Icon />
              </span>
              <h3 className="mt-5 text-lg">{title}</h3>
              <p className="mt-2 max-w-[38ch] leading-relaxed text-text-muted">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
