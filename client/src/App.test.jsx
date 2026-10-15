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
  it("renders the hero heading", async () => {
    renderApp();
    expect(screen.getByRole("heading", { level: 1, name: "GEN PADEL ROZNOV" })).toBeInTheDocument();
    // App also fetches the courts on mount. Wait for that to settle so the
    // state update does not land after this test has already finished.
    await screen.findByText("Court 1");
  });

  it("shows the courts from the server", async () => {
    renderApp();
    expect(await screen.findByText("Court 1")).toBeInTheDocument();
  });

  it("links each court to its own preselected spot on the booking page", async () => {
    renderApp();
    const link = await screen.findByRole("link", { name: "Court 1" });
    expect(link).toHaveAttribute("href", "/booking?court=1");
  });

  it("shows the sunset photo band, sized to prevent layout shift, lazy loaded, with real alt text", async () => {
    renderApp();
    const photo = screen.getByRole("img", { name: /courts at sunset/i });
    expect(photo).toHaveAttribute("width", "1200");
    expect(photo).toHaveAttribute("height", "799");
    expect(photo).toHaveAttribute("loading", "lazy");
    expect(photo.alt).not.toMatch(/padel court photo/i);
    expect(screen.getByRole("heading", { name: "Play on, after dark" })).toBeInTheDocument();
  });
});
