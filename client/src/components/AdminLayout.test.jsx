import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AdminLayout from "./AdminLayout.jsx";

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../context/AuthContext.jsx";

describe("AdminLayout", () => {
  it("shows the admin section nav, a link back to the site, and the page content", () => {
    useAuth.mockReturnValue({ logout: vi.fn() });

    render(
      <MemoryRouter initialEntries={["/admin/bookings"]}>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route path="/admin/bookings" element={<p>Bookings content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("GEN PADEL Admin")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bookings" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Courts" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Users" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Coupons" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tournaments" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to site" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(screen.getByText("Bookings content")).toBeInTheDocument();
  });

  it("has no public site navigation", () => {
    useAuth.mockReturnValue({ logout: vi.fn() });

    render(
      <MemoryRouter initialEntries={["/admin/bookings"]}>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route path="/admin/bookings" element={<p>Bookings content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByRole("link", { name: "Booking" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Contact" })).not.toBeInTheDocument();
  });
});
