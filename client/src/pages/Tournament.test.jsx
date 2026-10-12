import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Tournament from "./Tournament.jsx";

vi.mock("../api/tournaments.js", () => ({
  fetchTournamentOverview: vi.fn(),
}));

import { fetchTournamentOverview } from "../api/tournaments.js";

const baseOverview = {
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
  sitOutPlayers: [{ id: 5, displayName: "Pat" }],
  standings: [
    { rank: 1, id: 1, displayName: "Alex", points: 40, matchesPlayed: 2, pointsDifference: 12 },
    { rank: 2, id: 3, displayName: "Jo", points: 28, matchesPlayed: 2, pointsDifference: -4 },
  ],
};

function renderTournament(id = 1) {
  render(
    <MemoryRouter initialEntries={[`/tournaments/${id}`]}>
      <Routes>
        <Route path="/tournaments/:id" element={<Tournament />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Tournament", () => {
  it("shows a loading message while the overview has not arrived yet", () => {
    fetchTournamentOverview.mockReturnValue(new Promise(() => {}));
    renderTournament();

    expect(screen.getByText(/loading tournament/i)).toBeInTheDocument();
  });

  it("shows an error when the overview could not be loaded", async () => {
    fetchTournamentOverview.mockRejectedValue(new Error("This tournament could not be loaded"));
    renderTournament();

    expect(await screen.findByText("This tournament could not be loaded")).toBeInTheDocument();
  });

  it("shows the tournament name, format and round", async () => {
    fetchTournamentOverview.mockResolvedValue(baseOverview);
    renderTournament();

    expect(await screen.findByRole("heading", { name: "Summer Mexicano" })).toBeInTheDocument();
    expect(screen.getByText(/Mexicano, played to 24 points/)).toBeInTheDocument();
    expect(screen.getByText(/Round 2 of 6/)).toBeInTheDocument();
  });

  it("shows each match's court, teams and score", async () => {
    fetchTournamentOverview.mockResolvedValue({
      ...baseOverview,
      matches: [{ ...baseOverview.matches[0], scoreA: 16, scoreB: 8 }],
    });
    renderTournament();

    expect(await screen.findByText("Court 1")).toBeInTheDocument();
    expect(screen.getByText("Alex & Sam")).toBeInTheDocument();
    expect(screen.getByText("Jo & Kim")).toBeInTheDocument();
    expect(screen.getByText(/16.*8/)).toBeInTheDocument();
  });

  it("shows who is sitting out this round", async () => {
    fetchTournamentOverview.mockResolvedValue(baseOverview);
    renderTournament();

    expect(await screen.findByText(/Sitting out this round: Pat/)).toBeInTheDocument();
  });

  it("shows the schedule has not started when there is no current round", async () => {
    fetchTournamentOverview.mockResolvedValue({
      ...baseOverview,
      currentRound: 0,
      matches: [],
      sitOutPlayers: [],
    });
    renderTournament();

    expect(await screen.findByText(/has not started yet/i)).toBeInTheDocument();
  });

  it("shows the next round once the current one is finished", async () => {
    fetchTournamentOverview.mockResolvedValue({ ...baseOverview, isCurrentRoundComplete: true });
    renderTournament();

    expect(await screen.findByText(/Round 2 is finished. Round 3 is next./)).toBeInTheDocument();
  });

  it("shows the tournament is finished once its status says so", async () => {
    fetchTournamentOverview.mockResolvedValue({
      ...baseOverview,
      tournament: { ...baseOverview.tournament, status: "finished" },
      currentRound: 6,
      isCurrentRoundComplete: true,
    });
    renderTournament();

    expect(await screen.findByText("This tournament is finished.")).toBeInTheDocument();
  });

  it("shows the standings ranked with points and points difference", async () => {
    fetchTournamentOverview.mockResolvedValue(baseOverview);
    renderTournament();

    expect(await screen.findByText("Alex")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
    expect(screen.getByText("+12")).toBeInTheDocument();
    expect(screen.getByText("-4")).toBeInTheDocument();
  });
});
