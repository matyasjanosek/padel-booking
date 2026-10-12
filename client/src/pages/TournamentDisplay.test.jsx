import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import TournamentDisplay from "./TournamentDisplay.jsx";

vi.mock("../api/tournaments.js", () => ({
  fetchTournamentOverview: vi.fn(),
}));

import { fetchTournamentOverview } from "../api/tournaments.js";

const overview = {
  tournament: {
    id: 1,
    name: "Summer Mexicano",
    format: "mexicano",
    status: "active",
    pointsPerMatch: 24,
    roundCount: 6,
  },
  currentRound: 2,
  isCurrentRoundComplete: false,
  matches: [
    {
      id: 1,
      courtId: 10,
      courtName: "Court 1",
      status: "pending",
      scoreA: null,
      scoreB: null,
      teamA: [
        { id: 1, displayName: "Alex" },
        { id: 2, displayName: "Sam" },
      ],
      teamB: [
        { id: 3, displayName: "Jo" },
        { id: 4, displayName: "Kim" },
      ],
    },
  ],
  sitOutPlayers: [],
  standings: [
    { rank: 1, id: 1, displayName: "Alex", points: 40, matchesPlayed: 2, pointsDifference: 12 },
  ],
};

function renderDisplay(id = 1) {
  render(
    <MemoryRouter initialEntries={[`/tournaments/${id}/display`]}>
      <Routes>
        <Route path="/tournaments/:id/display" element={<TournamentDisplay />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("TournamentDisplay", () => {
  it("shows a loading message while the overview has not arrived yet", () => {
    fetchTournamentOverview.mockReturnValue(new Promise(() => {}));
    renderDisplay();

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows an error when the overview could not be loaded", async () => {
    fetchTournamentOverview.mockRejectedValue(new Error("This tournament could not be loaded"));
    renderDisplay();

    expect(await screen.findByText("This tournament could not be loaded")).toBeInTheDocument();
  });

  it("shows the tournament name, round, matches and standings", async () => {
    fetchTournamentOverview.mockResolvedValue(overview);
    renderDisplay();

    expect(await screen.findByRole("heading", { name: "Summer Mexicano" })).toBeInTheDocument();
    expect(screen.getByText("Round 2 of 6")).toBeInTheDocument();
    expect(screen.getByText("Alex & Sam")).toBeInTheDocument();
    expect(screen.getByText("Jo & Kim")).toBeInTheDocument();
    expect(screen.getByText("Alex")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
  });

  it("polls for a fresh overview every 5 seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fetchTournamentOverview.mockResolvedValue(overview);
    renderDisplay();

    await vi.waitFor(() => expect(fetchTournamentOverview).toHaveBeenCalledTimes(1));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(fetchTournamentOverview).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(fetchTournamentOverview).toHaveBeenCalledTimes(3);
  });
});
