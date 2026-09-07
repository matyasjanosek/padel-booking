import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

describe("App", () => {
  it("renders the centre name", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Padel Centre" })).toBeInTheDocument();
  });

  it("shows the courts from the server", async () => {
    render(<App />);
    expect(await screen.findByText("Court 1")).toBeInTheDocument();
  });
});
