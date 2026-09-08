import { Link } from "react-router-dom";
import "../styles/hero.css";

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-content">
        <p className="hero-eyebrow">Outdoor padel club</p>
        <h1 className="hero-title">
          <span>GEN</span> <span className="hero-title-accent">PADEL</span> <span>ROZNOV</span>
        </h1>
        <p className="hero-lead">
          The club has two outdoor courts with floodlights. You book and pay online. After you pay,
          the lights turn on for your booked time and you get a code for the gate. There is no
          reception.
        </p>
        <Link to="/booking" className="hero-cta">
          Book a court
        </Link>
      </div>
      <div className="hero-visual" aria-hidden="true" />
    </section>
  );
}
