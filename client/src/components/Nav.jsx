import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/info", label: "Info" },
  { to: "/booking", label: "Booking" },
  { to: "/contact", label: "Contact" },
];

export default function Nav() {
  return (
    <header className="nav">
      <NavLink to="/" className="nav-logo">
        GEN PADEL
      </NavLink>
      <nav className="nav-links">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.end}>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
