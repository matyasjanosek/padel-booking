import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RequireAdmin from "./RequireAdmin.jsx";

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../context/AuthContext.jsx";

function renderGuard() {
  render(
    <MemoryRouter initialEntries={["/admin/bookings"]}>
      <Routes>
        <Route element={<RequireAdmin />}>
          <Route path="/admin/bookings" element={<p>Admin content</p>} />
        </Route>
        <Route path="/login" element={<p>Login page</p>} />
        <Route path="/" element={<p>Home page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireAdmin", () => {
  it("renders nothing while the session is still loading", () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    renderGuard();
    expect(screen.queryByText("Admin content")).not.toBeInTheDocument();
    expect(screen.queryByText("Login page")).not.toBeInTheDocument();
  });

  it("redirects to /login when there is no user", () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    renderGuard();
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("redirects a logged in member to the home page", () => {
    useAuth.mockReturnValue({ user: { id: 1, role: "member" }, loading: false });
    renderGuard();
    expect(screen.getByText("Home page")).toBeInTheDocument();
  });

  it("renders the protected route for an admin", () => {
    useAuth.mockReturnValue({ user: { id: 1, role: "admin" }, loading: false });
    renderGuard();
    expect(screen.getByText("Admin content")).toBeInTheDocument();
  });
});
