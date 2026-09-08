import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/info", label: "Info" },
  { to: "/booking", label: "Booking" },
  { to: "/contact", label: "Contact" },
];

export default function Nav() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-border bg-surface px-5 py-4 sm:px-8">
      <NavLink to="/" className="font-heading text-lg font-bold text-text">
        GEN PADEL
      </NavLink>
      <nav className="flex flex-wrap gap-4">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              isActive ? "font-medium text-accent" : "font-medium text-text-muted hover:text-text"
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
