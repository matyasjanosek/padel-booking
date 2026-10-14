import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Nav from "./Nav.jsx";

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../context/AuthContext.jsx";

function renderNav(initialEntries = ["/"]) {
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Nav />
    </MemoryRouter>,
  );
}

// The desktop links and the mobile menu's own copy share the same labels;
// only one of the two is ever actually visible in a real browser, CSS
// decides which, but jsdom renders both into the DOM regardless. Scoping to
// the desktop nav's own landmark is what a real visitor's assistive tech
// would see too, since the other copy is either display:none or has the
// native hidden attribute.
function desktopNav() {
  return within(screen.getByRole("navigation", { name: "Primary" }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Nav", () => {
  it("shows a login link when logged out", () => {
    useAuth.mockReturnValue({ user: null, loading: false, logout: vi.fn() });
    renderNav();
    expect(desktopNav().getByRole("link", { name: "Login" })).toBeInTheDocument();
    expect(desktopNav().queryByRole("link", { name: "Account" })).not.toBeInTheDocument();
  });

  it("shows the account link and a log out button when logged in", () => {
    useAuth.mockReturnValue({
      user: { id: 1, name: "Alex" },
      loading: false,
      logout: vi.fn(),
    });
    renderNav();
    expect(desktopNav().getByRole("link", { name: "Account" })).toBeInTheDocument();
    expect(desktopNav().getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(desktopNav().queryByRole("link", { name: "Login" })).not.toBeInTheDocument();
  });

  it("shows neither link while the session is still loading", () => {
    useAuth.mockReturnValue({ user: null, loading: true, logout: vi.fn() });
    renderNav();
    expect(desktopNav().queryByRole("link", { name: "Login" })).not.toBeInTheDocument();
    expect(desktopNav().queryByRole("link", { name: "Account" })).not.toBeInTheDocument();
  });

  it("marks the current page as current, not only by colour", () => {
    useAuth.mockReturnValue({ user: null, loading: false, logout: vi.fn() });
    renderNav(["/info"]);
    const infoLink = desktopNav().getByRole("link", { name: "Info" });
    expect(infoLink).toHaveAttribute("aria-current", "page");
    expect(infoLink.className).toContain("underline");
    expect(desktopNav().getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("shows exactly one filled action, Book a court", () => {
    useAuth.mockReturnValue({ user: null, loading: false, logout: vi.fn() });
    renderNav();
    const bookLink = desktopNav().getByRole("link", { name: "Book a court" });
    expect(bookLink.className).toContain("btn-primary");
  });

  describe("mobile menu", () => {
    it("is closed to begin with", () => {
      useAuth.mockReturnValue({ user: null, loading: false, logout: vi.fn() });
      renderNav();
      expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
      expect(screen.getByRole("dialog", { hidden: true })).not.toBeVisible();
    });

    it("opens on click, moves focus inside, and closes on Escape, returning focus to the toggle", () => {
      useAuth.mockReturnValue({ user: null, loading: false, logout: vi.fn() });
      renderNav();
      const toggle = screen.getByRole("button", { name: "Open menu" });

      fireEvent.click(toggle);

      expect(toggle).toHaveAttribute("aria-expanded", "true");
      const panel = screen.getByRole("dialog", { name: "Menu" });
      expect(panel).toBeVisible();
      expect(within(panel).getByRole("link", { name: "Home" })).toHaveFocus();

      fireEvent.keyDown(document, { key: "Escape" });

      expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
      expect(toggle).toHaveFocus();
    });

    it("traps Tab inside the panel while open, wrapping from the last link back to the first", () => {
      useAuth.mockReturnValue({ user: null, loading: false, logout: vi.fn() });
      renderNav();
      fireEvent.click(screen.getByRole("button", { name: "Open menu" }));

      const panel = screen.getByRole("dialog", { name: "Menu" });
      const focusables = within(panel).getAllByRole("link");
      focusables.at(-1).focus();

      fireEvent.keyDown(document, { key: "Tab" });

      expect(focusables[0]).toHaveFocus();
    });

    it("closes when a link inside it is followed", () => {
      useAuth.mockReturnValue({ user: null, loading: false, logout: vi.fn() });
      renderNav();
      fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
      const panel = screen.getByRole("dialog", { name: "Menu" });

      fireEvent.click(within(panel).getByRole("link", { name: "Info" }));

      expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
    });
  });
});
