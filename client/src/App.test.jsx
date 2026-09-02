import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App.jsx";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ status: "ok" }) })),
  );
});

describe("App", () => {
  it("renders the centre name", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Padel Centre" })).toBeInTheDocument();
  });
});
