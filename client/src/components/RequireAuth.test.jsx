import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RequireAuth from "./RequireAuth.jsx";

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../context/AuthContext.jsx";

function renderGuard() {
  render(
    <MemoryRouter initialEntries={["/account"]}>
      <Routes>
        <Route element={<RequireAuth />}>
          <Route path="/account" element={<p>Account content</p>} />
        </Route>
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireAuth", () => {
  it("renders nothing while the session is still loading", () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    renderGuard();
    expect(screen.queryByText("Account content")).not.toBeInTheDocument();
    expect(screen.queryByText("Login page")).not.toBeInTheDocument();
  });

  it("redirects to /login when there is no user", () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    renderGuard();
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("renders the protected route when logged in", () => {
    useAuth.mockReturnValue({ user: { id: 1 }, loading: false });
    renderGuard();
    expect(screen.getByText("Account content")).toBeInTheDocument();
  });
});
