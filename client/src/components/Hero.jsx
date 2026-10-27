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
      className="absolute -left-[12%] -right-[4%] -top-[14%] -bottom-[14%] h-[128%] w-[116%]"
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
    <section className="grid gap-8 px-5 py-8 md:max-w-page md:grid-cols-[1.2fr_1fr] md:items-center md:gap-8 md:py-8 md:pl-24 md:pr-10">
      <div>
        <h1 className="mb-4 flex flex-col text-[clamp(4rem,7.4vw,8.875rem)] leading-[0.92] tracking-[-0.03em]">
          <span>GEN</span>
          <span className="text-hero-accent">PADEL</span>
          <span className="mt-[0.12em] text-transparent [-webkit-text-stroke:2px_var(--color-text)]">
            ROZNOV
          </span>
        </h1>

        <p className="max-w-[42ch] text-[clamp(1.125rem,1.3vw,1.375rem)] font-semibold leading-snug tracking-[-0.01em]">
          Pick a time, pay online, walk straight on court.
        </p>
        <p className="mt-2 max-w-[36ch] text-base leading-relaxed text-text-muted">
          Your gate code comes by email and the floodlights turn on for your booked time. No
          reception, no phone calls, no waiting.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link to="/booking" className="btn-primary btn-primary-hero gap-3 text-base">
            Book a court
            <ArrowIcon />
          </Link>
          <a href="#how-it-works" className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex size-9 items-center justify-center rounded-full border border-border">
              <PlayIcon />
            </span>
            How it works
          </a>
        </div>

        <ol className="mt-6 grid max-w-[38rem] grid-cols-1 gap-x-6 gap-y-3 border-t border-border pt-4 md:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step.n} className="flex items-baseline gap-3">
              <span className="font-heading text-sm text-hero-accent">{step.n}</span>
              <div>
                <b className="block text-sm font-semibold">{step.title}</b>
                <span className="text-sm text-text-muted">{step.detail}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div
        className="relative hidden aspect-square w-full max-w-[36rem] justify-self-center md:block"
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
          className="-right-[2%] top-[4%]"
        />
        <HeroCard
          icon={
            <span className="flex size-11 flex-none items-center justify-center rounded-[14px] bg-hero-accent text-bg">
              <LightsIcon />
            </span>
          }
          label="Floodlights"
          value="On after payment"
          className="-right-[3%] bottom-[6%]"
        />
      </div>
    </section>
  );
}
