import { Link } from "react-router-dom";

export default function Hero() {
  return (
    <section className="grid gap-8 px-5 pb-12 pt-8 md:min-h-[70vh] md:max-w-page md:grid-cols-[1.1fr_1fr] md:items-center md:gap-12 md:pb-20 md:pl-24 md:pr-10 md:pt-16">
      <div className="hero-enter">
        <p className="m-0 text-sm font-medium uppercase tracking-[0.22em] text-accent">
          Outdoor padel club
        </p>
        <h1 className="mt-5 mb-6 flex flex-col text-[clamp(2.5rem,12vw,6.5rem)] leading-[0.92] tracking-[-0.03em]">
          <span>GEN</span> <span className="text-accent">PADEL</span> <span>ROZNOV</span>
        </h1>
        <p className="mb-8 max-w-[46ch] text-base text-text-muted">
          The club has two outdoor courts with floodlights. You book and pay online. After you pay,
          the lights turn on for your booked time and you get a code for the gate. There is no
          reception.
        </p>
        <Link
          to="/booking"
          className="inline-block rounded-full border border-border px-7 py-3 font-medium text-text transition-colors duration-200 hover:border-accent hover:text-accent"
        >
          Book a court
        </Link>
      </div>
      {/* Right column stays empty. The 3D ball is added here in the next step. */}
      <div className="hidden md:block md:min-h-[360px] md:self-stretch" aria-hidden="true" />
    </section>
  );
}
