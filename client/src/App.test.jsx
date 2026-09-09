import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App.jsx";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([{ id: 1, name: "Court 1" }]),
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

  it("shows the courts from the server", async () => {
    renderApp();
    expect(await screen.findByText("Court 1")).toBeInTheDocument();
  });
});
