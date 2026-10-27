import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App.jsx";

// Hero's own NextFreeSlotCard fetches courts and availability on mount.
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      }),
    ),
  );
});

function renderApp() {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );
}

describe("App", () => {
  it("renders the hero heading", () => {
    renderApp();
    expect(screen.getByRole("heading", { level: 1, name: "GEN PADEL ROZNOV" })).toBeInTheDocument();
  });

  it("links the hero's How it works button to the section below", () => {
    renderApp();
    const link = screen.getByRole("link", { name: "How it works" });
    expect(link).toHaveAttribute("href", "#how-it-works");
  });

  it("renders the how it works section with its three steps", () => {
    renderApp();
    expect(screen.getByRole("heading", { level: 2, name: "How it works" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pick a time" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pay online" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Walk straight on" })).toBeInTheDocument();
  });
});
