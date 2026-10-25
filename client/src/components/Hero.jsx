import { Link } from "react-router-dom";
import HeroBall from "./HeroBall.jsx";

export default function Hero() {
  return (
    <section className="grid gap-8 px-5 pb-20 pt-16 md:min-h-[70vh] md:max-w-page md:grid-cols-[1.1fr_1fr] md:items-center md:gap-12 md:pb-20 md:pl-24 md:pr-10 md:pt-16">
      <div>
        <h1 className="mb-7 flex flex-col text-[clamp(2.875rem,13vw,6.5rem)] leading-[0.92] tracking-[-0.03em]">
          <span>GEN</span> <span className="text-hero-accent">PADEL</span> <span>ROZNOV</span>
        </h1>
        <p className="mb-9 max-w-[46ch] text-[1.0625rem] text-text-muted">
          The club has two outdoor courts with floodlights. You book and pay online. After you pay,
          the lights turn on for your booked time and you get a code for the gate. There is no
          reception.
        </p>
        <Link to="/booking" className="btn-primary btn-primary-hero">
          Book a court
        </Link>
      </div>
      <HeroBall />
    </section>
  );
}
