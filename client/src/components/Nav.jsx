import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/info", label: "Info" },
  { to: "/booking", label: "Booking" },
  { to: "/contact", label: "Contact" },
];

const linkClassName = ({ isActive }) =>
  isActive ? "font-medium text-accent" : "font-medium text-text-muted hover:text-text";

export default function Nav() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-border bg-surface px-5 py-4 sm:px-8">
      <NavLink to="/" className="font-heading text-lg font-bold text-text">
        GEN PADEL
      </NavLink>
      <nav className="flex flex-wrap items-center gap-4">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.end} className={linkClassName}>
            {link.label}
          </NavLink>
        ))}
        {!loading &&
          (user ? (
            <>
              <NavLink to="/account" className={linkClassName}>
                Account
              </NavLink>
              <button
                type="button"
                onClick={handleLogout}
                className="font-medium text-text-muted hover:text-text"
              >
                Log out
              </button>
            </>
          ) : (
            <NavLink to="/login" className={linkClassName}>
              Login
            </NavLink>
          ))}
      </nav>
    </header>
  );
}
