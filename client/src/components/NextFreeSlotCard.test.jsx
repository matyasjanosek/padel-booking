import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import NextFreeSlotCard from "./NextFreeSlotCard.jsx";

vi.mock("../api/courts.js", () => ({
  fetchCourts: vi.fn(),
}));
vi.mock("../api/availability.js", () => ({
  fetchAvailability: vi.fn(),
}));

import { fetchCourts } from "../api/courts.js";
import { fetchAvailability } from "../api/availability.js";

const COURTS = [
  { id: 1, name: "Court 1" },
  { id: 2, name: "Court 2" },
];

const taken = {
  startTime: "2030-06-10T08:00:00+02:00",
  endTime: "2030-06-10T08:30:00+02:00",
  status: "taken",
};

function freeAt(time) {
  return { startTime: time, endTime: time, status: "free", maxUnits: 4 };
}

beforeEach(() => {
  // "Today" is fixed so the card's own search from todayInPrague() is
  // deterministic; only Date is faked so testing-library's own polling
  // (setTimeout-based) keeps working.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2030-06-10T10:00:00+02:00"));
  fetchCourts.mockResolvedValue(COURTS);
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("NextFreeSlotCard", () => {
  it("shows the earliest free slot today, across every court", async () => {
    fetchAvailability.mockImplementation(({ courtId }) =>
      Promise.resolve({
        slots:
          courtId === 1
            ? [freeAt("2030-06-10T09:00:00+02:00")]
            : [freeAt("2030-06-10T08:00:00+02:00")],
      }),
    );

    render(<NextFreeSlotCard />);

    expect(await screen.findByText("Today 08:00 · Court 2")).toBeInTheDocument();
  });

  it("falls back to the next day with a free slot when today has none", async () => {
    fetchAvailability.mockImplementation(({ date }) =>
      Promise.resolve({
        slots: date === "2030-06-11" ? [freeAt("2030-06-11T09:00:00+02:00")] : [taken],
      }),
    );

    render(<NextFreeSlotCard />);

    expect(await screen.findByText("Tue 09:00 · Court 1")).toBeInTheDocument();
  });

  it("renders nothing when the courts request fails", async () => {
    fetchCourts.mockRejectedValue(new Error("network error"));

    const { container } = render(<NextFreeSlotCard />);

    await waitFor(() => expect(fetchCourts).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when no court has a free slot in the search window", async () => {
    fetchCourts.mockResolvedValue([COURTS[0]]);
    fetchAvailability.mockResolvedValue({ slots: [taken] });

    const { container } = render(<NextFreeSlotCard />);

    // 15 days searched (today plus 14 ahead), one court.
    await waitFor(() => expect(fetchAvailability).toHaveBeenCalledTimes(15));
    expect(container).toBeEmptyDOMElement();
  });
});
