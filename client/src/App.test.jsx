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
});
