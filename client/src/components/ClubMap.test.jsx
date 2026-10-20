import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import ClubMap from "./ClubMap.jsx";

const tileHandlers = {};
const tileLayer = {
  addTo: vi.fn(() => tileLayer),
  on: vi.fn((event, handler) => {
    tileHandlers[event] = handler;
  }),
};
const map = { remove: vi.fn() };

vi.mock("leaflet", () => ({
  default: {
    map: vi.fn(() => map),
    tileLayer: vi.fn(() => tileLayer),
    marker: vi.fn(() => ({ addTo: vi.fn() })),
    divIcon: vi.fn(() => ({})),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ClubMap", () => {
  it("shows the address and a directions link while the map has not loaded yet", () => {
    render(<ClubMap />);
    expect(screen.getByText(/Pod strání 2268/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Get directions" })).toHaveAttribute(
      "href",
      expect.stringContaining("google.com/maps"),
    );
  });

  it("hides the fallback once the first tile loads", () => {
    render(<ClubMap />);
    act(() => tileHandlers.tileload());
    expect(screen.queryByText(/Pod strání 2268/)).not.toBeInTheDocument();
  });

  it("keeps the fallback up if every tile fails before any succeed", () => {
    render(<ClubMap />);
    act(() => tileHandlers.tileerror());
    expect(screen.getByText(/Pod strání 2268/)).toBeInTheDocument();
  });

  it("does not fall back over a late tile error once tiles are already showing", () => {
    render(<ClubMap />);
    act(() => tileHandlers.tileload());
    act(() => tileHandlers.tileerror());
    expect(screen.queryByText(/Pod strání 2268/)).not.toBeInTheDocument();
  });

  it("falls back if nothing loads within a few seconds, for blockers that fire no error", () => {
    render(<ClubMap />);
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByText(/Pod strání 2268/)).toBeInTheDocument();
  });
});
