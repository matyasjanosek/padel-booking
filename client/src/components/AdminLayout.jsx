import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// Coupons and Tournaments join this list as their own admin sections are
// built, nothing else about this layout needs to change for that.
const sections = [
  { to: "/admin/bookings", label: "Bookings" },
  { to: "/admin/courts", label: "Courts" },
  { to: "/admin/users", label: "Users" },
];

const linkClassName = ({ isActive }) =>
  isActive ? "font-medium text-accent" : "font-medium text-text-muted hover:text-text";

export default function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-surface px-5 py-4 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <span className="font-heading text-lg font-bold text-text">GEN PADEL Admin</span>
          <nav className="flex flex-wrap items-center gap-4">
            <NavLink to="/" className="font-medium text-text-muted hover:text-text">
              Back to site
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              className="font-medium text-text-muted hover:text-text"
            >
              Log out
            </button>
          </nav>
        </div>
        <nav className="mt-4 flex flex-wrap items-center gap-4">
          {sections.map((section) => (
            <NavLink key={section.to} to={section.to} className={linkClassName}>
              {section.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="w-full flex-1">
        <Outlet />
      </main>
    </div>
  );
}
