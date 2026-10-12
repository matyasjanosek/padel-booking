import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminTournaments from "./AdminTournaments.jsx";

vi.mock("../api/tournaments.js", () => ({
  fetchAdminTournaments: vi.fn(),
  createTournament: vi.fn(),
}));

import { fetchAdminTournaments, createTournament } from "../api/tournaments.js";

const tournament = {
  id: 1,
  name: "Summer Mexicano",
  format: "mexicano",
  status: "active",
  pointsPerMatch: 24,
  courtCount: 2,
  roundCount: 6,
};

function renderPage() {
  render(
    <MemoryRouter>
      <AdminTournaments />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminTournaments", () => {
  it("shows a loading message while the tournaments have not arrived yet", () => {
    fetchAdminTournaments.mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByText(/loading tournaments/i)).toBeInTheDocument();
  });

  it("shows an error when the tournaments could not be loaded", async () => {
    fetchAdminTournaments.mockRejectedValue(new Error("Could not load tournaments"));
    renderPage();

    expect(await screen.findByText("Could not load tournaments")).toBeInTheDocument();
  });

  it("shows a message when there are no tournaments yet", async () => {
    fetchAdminTournaments.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText("No tournaments yet.")).toBeInTheDocument();
  });

  it("shows each tournament's name, format and status, with a link to manage it", async () => {
    fetchAdminTournaments.mockResolvedValue([tournament]);
    renderPage();

    const row = (await screen.findAllByRole("row"))[1];
    expect(within(row).getByText("Summer Mexicano")).toBeInTheDocument();
    expect(within(row).getByText("Mexicano")).toBeInTheDocument();
    expect(within(row).getByText("Active")).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: "Open" })).toHaveAttribute(
      "href",
      "/admin/tournaments/1",
    );
  });

  it("creates a tournament from the form and adds it to the top of the list", async () => {
    fetchAdminTournaments.mockResolvedValue([]);
    createTournament.mockResolvedValue({ ...tournament, id: 2, name: "Winter Americano" });
    renderPage();

    fireEvent.change(await screen.findByLabelText("Name"), {
      target: { value: "Winter Americano" },
    });
    fireEvent.change(screen.getByLabelText("Points per match"), { target: { value: "24" } });
    fireEvent.change(screen.getByLabelText("Courts to use"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Number of rounds"), { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: "Create tournament" }));

    expect(await screen.findByText("Winter Americano")).toBeInTheDocument();
    expect(createTournament).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Winter Americano",
        format: "mexicano",
        pointsPerMatch: "24",
        courtCount: "2",
        roundCount: "6",
      }),
    );
  });

  it("shows the server's error when creating a tournament fails", async () => {
    fetchAdminTournaments.mockResolvedValue([]);
    createTournament.mockRejectedValue(new Error("Enter a valid number of rounds"));
    renderPage();

    fireEvent.change(await screen.findByLabelText("Name"), { target: { value: "Test" } });
    fireEvent.change(screen.getByLabelText("Points per match"), { target: { value: "24" } });
    fireEvent.change(screen.getByLabelText("Courts to use"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Number of rounds"), { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: "Create tournament" }));

    expect(await screen.findByText("Enter a valid number of rounds")).toBeInTheDocument();
  });
});
