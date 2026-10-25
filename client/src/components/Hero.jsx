import { Link } from "react-router-dom";
import HeroBall from "./HeroBall.jsx";
import HeroCard from "./HeroCard.jsx";
import NextFreeSlotCard from "./NextFreeSlotCard.jsx";

const STEPS = [
  { n: "01", title: "Pick a time", detail: "See free slots live" },
  { n: "02", title: "Pay online", detail: "Card, when you book" },
  { n: "03", title: "Code and lights", detail: "Ready when you arrive" },
];

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function LightsIcon() {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z" />
    </svg>
  );
}

// The court's own outline behind the ball, decorative. Real proportions,
// not a literal survey.
function CourtLines() {
  return (
    <svg
      className="absolute -left-[12%] -right-[20%] -top-[6%] -bottom-[6%] h-[112%] w-[132%]"
      viewBox="0 0 1180 860"
      fill="none"
      aria-hidden="true"
    >
      <g className="stroke-hero-accent/[0.16]" strokeWidth="2">
        <path d="M300 120 L900 120 L1160 820 L40 820 Z" />
        <path d="M232 300 L968 300" />
        <path d="M118 610 L1082 610" />
        <path d="M600 300 L600 610" />
      </g>
      <path d="M190 415 L1010 415" className="stroke-text/[0.28]" strokeWidth="3" />
      <path
        d="M190 415 L190 385 L1010 385 L1010 415"
        className="stroke-text/[0.12]"
        strokeWidth="2"
      />
    </svg>
  );
}

export default function Hero() {
  return (
    <section className="grid gap-12 px-5 py-16 md:max-w-page md:grid-cols-[1.1fr_1fr] md:items-center md:gap-12 md:py-24 md:pl-24 md:pr-10">
      <div>
        <h1 className="mb-9 flex flex-col text-[clamp(4rem,7.4vw,8.875rem)] leading-[0.84] tracking-[-0.035em]">
          <span>GEN</span>
          <span className="text-hero-accent">PADEL</span>
          <span className="text-transparent [-webkit-text-stroke:2px_var(--color-text)]">
            ROZNOV
          </span>
        </h1>

        <p className="max-w-[46ch] text-[clamp(1.375rem,1.5vw,1.75rem)] font-semibold leading-tight tracking-[-0.01em]">
          Pick a time, pay online, walk straight on court.
        </p>
        <p className="mt-3 max-w-[38ch] text-lg leading-relaxed text-text-muted">
          Your gate code comes by email and the floodlights turn on for your booked time. No
          reception, no phone calls, no waiting.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
          <Link to="/booking" className="btn-primary btn-primary-hero gap-3.5 text-lg">
            Book a court
            <ArrowIcon />
          </Link>
          <a href="#how-it-works" className="flex items-center gap-2.5 font-semibold">
            <span className="flex size-10 items-center justify-center rounded-full border border-border">
              <PlayIcon />
            </span>
            How it works
          </a>
        </div>

        <ol
          id="how-it-works"
          className="mt-11 flex max-w-[45rem] flex-wrap gap-x-14 gap-y-5 border-t border-border pt-7"
        >
          {STEPS.map((step) => (
            <li key={step.n} className="flex items-baseline gap-3.5">
              <span className="font-heading text-sm text-hero-accent">{step.n}</span>
              <div>
                <b className="block font-semibold">{step.title}</b>
                <span className="text-[15px] text-text-muted">{step.detail}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div
        className="relative hidden aspect-square w-full max-w-[47.5rem] justify-self-center md:block"
        aria-hidden="true"
      >
        <CourtLines />
        <HeroBall />
        <NextFreeSlotCard />
        <HeroCard
          icon={
            <span className="size-2 flex-none animate-pulse rounded-full bg-hero-accent shadow-[0_0_12px_var(--color-hero-accent)]" />
          }
          value="Gate code by email"
          className="right-0 top-[14%]"
        />
        <HeroCard
          icon={
            <span className="flex size-11 flex-none items-center justify-center rounded-[14px] bg-hero-accent text-bg">
              <LightsIcon />
            </span>
          }
          label="Floodlights"
          value="On after payment"
          className="-right-[4%] bottom-[14%]"
        />
      </div>
    </section>
  );
}
