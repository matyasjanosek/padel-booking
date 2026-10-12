import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AdminTournamentDetail from "./AdminTournamentDetail.jsx";

vi.mock("../api/tournaments.js", () => ({
  fetchTournamentOverview: vi.fn(),
  registerPlayer: vi.fn(),
  removePlayer: vi.fn(),
  generateNextRound: vi.fn(),
  recordScore: vi.fn(),
}));
vi.mock("../api/adminUsers.js", () => ({
  fetchAdminUsers: vi.fn(),
}));

import {
  fetchTournamentOverview,
  registerPlayer,
  removePlayer,
  generateNextRound,
  recordScore,
} from "../api/tournaments.js";
import { fetchAdminUsers } from "../api/adminUsers.js";

const draftOverview = {
  tournament: {
    id: 1,
    name: "Summer Mexicano",
    format: "mexicano",
    status: "draft",
    pointsPerMatch: 24,
    roundCount: 6,
  },
  currentRound: 0,
  isCurrentRoundComplete: false,
  matches: [],
  sitOutPlayers: [
    { id: 1, displayName: "Alex" },
    { id: 2, displayName: "Sam" },
  ],
  standings: [],
};

const activeOverview = {
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
      id: 10,
      courtId: 1,
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
  ],
};

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/admin/tournaments/1"]}>
      <Routes>
        <Route path="/admin/tournaments/:id" element={<AdminTournamentDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchAdminUsers.mockResolvedValue([{ id: 9, name: "Robin" }]);
});

describe("AdminTournamentDetail", () => {
  it("shows a loading message while the tournament has not arrived yet", () => {
    fetchTournamentOverview.mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByText(/loading tournament/i)).toBeInTheDocument();
  });

  it("shows an error when the tournament could not be loaded", async () => {
    fetchTournamentOverview.mockRejectedValue(new Error("This tournament could not be loaded"));
    renderPage();

    expect(await screen.findByText("This tournament could not be loaded")).toBeInTheDocument();
  });

  it("shows the tournament name, format, status and round", async () => {
    fetchTournamentOverview.mockResolvedValue(activeOverview);
    renderPage();

    expect(await screen.findByRole("heading", { name: "Summer Mexicano" })).toBeInTheDocument();
    expect(screen.getByText(/Mexicano, played to 24 points/)).toBeInTheDocument();
    expect(screen.getByText(/Active/)).toBeInTheDocument();
    expect(screen.getByText(/Round 2 of 6/)).toBeInTheDocument();
  });

  it("shows a message when there are no players yet", async () => {
    fetchTournamentOverview.mockResolvedValue({ ...draftOverview, sitOutPlayers: [] });
    renderPage();

    expect(await screen.findByText("No players registered yet.")).toBeInTheDocument();
  });

  it("lists every registered player, playing or sitting out", async () => {
    fetchTournamentOverview.mockResolvedValue(activeOverview);
    renderPage();

    const list = (await screen.findByText("Pat")).closest("ul");
    expect(within(list).getByText("Alex")).toBeInTheDocument();
    expect(within(list).getByText("Sam")).toBeInTheDocument();
    expect(within(list).getByText("Jo")).toBeInTheDocument();
    expect(within(list).getByText("Kim")).toBeInTheDocument();
    expect(within(list).getByText("Pat")).toBeInTheDocument();
  });

  it("registers a guest and shows them in the list without a reload", async () => {
    fetchTournamentOverview.mockResolvedValue(draftOverview);
    registerPlayer.mockResolvedValue({ id: 3, displayName: "Guest Robin" });
    renderPage();

    fireEvent.change(await screen.findByLabelText("Register"), { target: { value: "guest" } });
    fireEvent.change(screen.getByLabelText("Guest name"), { target: { value: "Guest Robin" } });
    fireEvent.click(screen.getByRole("button", { name: "Register" }));

    expect(await screen.findByText("Guest Robin")).toBeInTheDocument();
    expect(registerPlayer).toHaveBeenCalledWith("1", { displayName: "Guest Robin" });
    expect(fetchTournamentOverview).toHaveBeenCalledTimes(1);
  });

  it("registers a member by their user id", async () => {
    fetchTournamentOverview.mockResolvedValue(draftOverview);
    registerPlayer.mockResolvedValue({ id: 3, displayName: "Robin" });
    renderPage();

    fireEvent.change(await screen.findByLabelText("Member"), { target: { value: "9" } });
    fireEvent.click(screen.getByRole("button", { name: "Register" }));

    expect(await screen.findByText("Robin")).toBeInTheDocument();
    expect(registerPlayer).toHaveBeenCalledWith("1", { userId: "9" });
  });

  it("shows the server's error when registering fails", async () => {
    fetchTournamentOverview.mockResolvedValue(draftOverview);
    registerPlayer.mockRejectedValue(new Error("This member is already registered"));
    renderPage();

    fireEvent.change(await screen.findByLabelText("Member"), { target: { value: "9" } });
    fireEvent.click(screen.getByRole("button", { name: "Register" }));

    expect(await screen.findByText("This member is already registered")).toBeInTheDocument();
  });

  it("lets a draft tournament remove a player", async () => {
    fetchTournamentOverview.mockResolvedValue(draftOverview);
    removePlayer.mockResolvedValue(undefined);
    renderPage();

    const row = (await screen.findByText("Alex")).closest("li");
    fireEvent.click(within(row).getByRole("button", { name: "Remove" }));

    expect(removePlayer).toHaveBeenCalledWith("1", 1);
    await vi.waitFor(() => expect(screen.queryByText("Alex")).not.toBeInTheDocument());
    expect(screen.getByText("Sam")).toBeInTheDocument();
  });

  it("locks removal once the tournament is no longer a draft", async () => {
    fetchTournamentOverview.mockResolvedValue(activeOverview);
    renderPage();

    const list = (await screen.findByText("Pat")).closest("ul");
    const row = within(list).getByText("Alex").closest("li");
    expect(within(row).getByText("Locked once started")).toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
  });

  it("generates round 1 when there is no current round", async () => {
    fetchTournamentOverview.mockResolvedValue(draftOverview);
    generateNextRound.mockResolvedValue({ round: 1, matches: [], sitOutPlayerIds: [] });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Generate round 1" }));

    expect(generateNextRound).toHaveBeenCalledWith("1");
    await vi.waitFor(() => expect(fetchTournamentOverview).toHaveBeenCalledTimes(2));
  });

  it("shows the server's error when generating a round fails", async () => {
    fetchTournamentOverview.mockResolvedValue(draftOverview);
    generateNextRound.mockRejectedValue(
      new Error("At least 4 players are needed to generate a round"),
    );
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Generate round 1" }));

    expect(
      await screen.findByText("At least 4 players are needed to generate a round"),
    ).toBeInTheDocument();
  });

  it("shows each match's court and teams, with a score stepper for each team", async () => {
    fetchTournamentOverview.mockResolvedValue(activeOverview);
    renderPage();

    expect(await screen.findByText("Court 1")).toBeInTheDocument();
    expect(screen.getByText("Alex & Sam")).toBeInTheDocument();
    expect(screen.getByText("Jo & Kim")).toBeInTheDocument();
    expect(screen.getAllByText("0")).toHaveLength(1);
    expect(screen.getByText("24")).toBeInTheDocument();
  });

  it("keeps the two team scores adding up to the points total as the stepper moves", async () => {
    fetchTournamentOverview.mockResolvedValue(activeOverview);
    renderPage();

    const card = (await screen.findByText("Court 1")).closest("div");
    const plusButtons = within(card).getAllByRole("button", { name: "+" });
    // The first stepper's + belongs to team A.
    fireEvent.click(plusButtons[0]);
    fireEvent.click(plusButtons[0]);

    expect(within(card).getByText("2")).toBeInTheDocument();
    expect(within(card).getByText("22")).toBeInTheDocument();
  });

  it("does not let team A's score go below 0 or above the points total", async () => {
    fetchTournamentOverview.mockResolvedValue(activeOverview);
    renderPage();

    await screen.findByText("Court 1");
    const minusButtons = screen.getAllByRole("button", { name: "−" });
    expect(minusButtons[0]).toBeDisabled();
  });

  it("saves a match score and reloads the tournament", async () => {
    fetchTournamentOverview.mockResolvedValue(activeOverview);
    recordScore.mockResolvedValue({ recorded: true });
    renderPage();

    await screen.findByText("Court 1");
    const plusButtons = screen.getAllByRole("button", { name: "+" });
    fireEvent.click(plusButtons[0]);
    fireEvent.click(screen.getByRole("button", { name: "Save score" }));

    await vi.waitFor(() =>
      expect(recordScore).toHaveBeenCalledWith("1", 10, { scoreA: 1, scoreB: 23 }),
    );
    await vi.waitFor(() => expect(fetchTournamentOverview).toHaveBeenCalledTimes(2));
  });

  it("shows the server's error under the match card when saving a score fails", async () => {
    fetchTournamentOverview.mockResolvedValue(activeOverview);
    recordScore.mockRejectedValue(
      new Error("The two scores must add up to this tournament's points per match"),
    );
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Save score" }));

    expect(
      await screen.findByText("The two scores must add up to this tournament's points per match"),
    ).toBeInTheDocument();
  });

  it("offers to generate the next round once the current one is complete", async () => {
    fetchTournamentOverview.mockResolvedValue({ ...activeOverview, isCurrentRoundComplete: true });
    renderPage();

    expect(await screen.findByRole("button", { name: "Generate round 3" })).toBeInTheDocument();
  });

  it("shows the tournament is finished and offers no further round", async () => {
    fetchTournamentOverview.mockResolvedValue({
      ...activeOverview,
      isCurrentRoundComplete: true,
      tournament: { ...activeOverview.tournament, status: "finished" },
    });
    renderPage();

    expect(await screen.findByText("This tournament is finished.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /generate round/i })).not.toBeInTheDocument();
  });

  it("shows the standings ranked with points and points difference", async () => {
    fetchTournamentOverview.mockResolvedValue(activeOverview);
    renderPage();

    expect(await screen.findByText("40")).toBeInTheDocument();
    expect(screen.getByText("+12")).toBeInTheDocument();
  });
});
