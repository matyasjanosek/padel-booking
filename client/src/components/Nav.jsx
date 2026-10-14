import { useEffect, useId, useRef, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/info", label: "Info" },
  { to: "/contact", label: "Contact" },
];

// Active is never colour alone: a heavier weight and an underline carry it
// too, and aria-current tells a screen reader the same thing.
function linkClassName({ isActive }) {
  return `font-medium underline-offset-4 ${
    isActive ? "font-semibold text-text underline" : "text-text-muted hover:text-text"
  }`;
}

function MenuIcon({ open }) {
  // A plain X when open, three bars when closed. Decorative, the button's
  // own accessible name carries the meaning.
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      {open ? (
        <path
          d="M6 6l12 12M18 6L6 18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ) : (
        <>
          <path d="M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M4 12h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export default function Nav() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const menuId = useId();

  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef(null);
  const panelRef = useRef(null);
  const wasOpenRef = useRef(false);

  // A route change (following a link inside the menu) always closes it.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Focus trap while open: Escape closes it, Tab cycles only through the
  // panel's own focusable elements instead of leaving it, and focus goes
  // to the first one as soon as it opens.
  useEffect(() => {
    if (!menuOpen) return;

    const focusables = panelRef.current.querySelectorAll("a[href], button:not([disabled])");
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
        return;
      }
      if (event.key !== "Tab" || focusables.length === 0) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  // Closing, whichever way it happens, always hands focus back to the
  // button that opened it, never leaves it stranded.
  useEffect(() => {
    if (wasOpenRef.current && !menuOpen) {
      toggleRef.current?.focus();
    }
    wasOpenRef.current = menuOpen;
  }, [menuOpen]);

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  const accountLinks = !loading && (
    <>
      {user ? (
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
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface px-5 py-4 sm:px-8">
      <div className="flex items-center justify-between gap-4">
        <NavLink to="/" className="font-heading text-lg font-bold text-text">
          GEN PADEL
        </NavLink>

        {/* Desktop: every link inline, plus the one filled action. */}
        <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={linkClassName}>
              {link.label}
            </NavLink>
          ))}
          {accountLinks}
          <NavLink to="/booking" className="btn-primary btn-sm">
            Book a court
          </NavLink>
        </nav>

        {/* Mobile: a single thumb-sized toggle, everything else in the panel. */}
        <button
          ref={toggleRef}
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="flex size-11 items-center justify-center text-text md:hidden"
        >
          <MenuIcon open={menuOpen} />
        </button>
      </div>

      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-bg/70 md:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        id={menuId}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        hidden={!menuOpen}
        className="absolute inset-x-0 top-full z-40 flex flex-col gap-1 border-b border-border bg-surface px-5 py-3 md:hidden"
      >
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `${linkClassName({ isActive })} py-3 text-lg`}
          >
            {link.label}
          </NavLink>
        ))}
        {accountLinks}
        <NavLink to="/booking" className="btn-primary mt-3 self-start">
          Book a court
        </NavLink>
      </div>
    </header>
  );
}
