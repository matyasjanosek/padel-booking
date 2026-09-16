import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Nav from "./Nav.jsx";

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../context/AuthContext.jsx";

function renderNav() {
  render(
    <MemoryRouter>
      <Nav />
    </MemoryRouter>,
  );
}

describe("Nav", () => {
  it("shows a login link when logged out", () => {
    useAuth.mockReturnValue({ user: null, loading: false, logout: vi.fn() });
    renderNav();
    expect(screen.getByRole("link", { name: "Login" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Account" })).not.toBeInTheDocument();
  });

  it("shows the account link and a log out button when logged in", () => {
    useAuth.mockReturnValue({
      user: { id: 1, name: "Alex" },
      loading: false,
      logout: vi.fn(),
    });
    renderNav();
    expect(screen.getByRole("link", { name: "Account" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Login" })).not.toBeInTheDocument();
  });

  it("shows neither link while the session is still loading", () => {
    useAuth.mockReturnValue({ user: null, loading: true, logout: vi.fn() });
    renderNav();
    expect(screen.queryByRole("link", { name: "Login" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Account" })).not.toBeInTheDocument();
  });
});
