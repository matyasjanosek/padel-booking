import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminCourts from "./AdminCourts.jsx";

vi.mock("../api/adminCourts.js", () => ({
  fetchAdminCourts: vi.fn(),
  renameCourt: vi.fn(),
  setCourtActive: vi.fn(),
}));

import { fetchAdminCourts, renameCourt, setCourtActive } from "../api/adminCourts.js";

const activeCourt = { id: 1, name: "Court 1", isActive: true };
const inactiveCourt = { id: 2, name: "Court 2", isActive: false };

function renderPage() {
  render(
    <MemoryRouter>
      <AdminCourts />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminCourts", () => {
  it("shows a loading message while the courts have not arrived yet", () => {
    fetchAdminCourts.mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByText(/loading courts/i)).toBeInTheDocument();
  });

  it("shows an error when the courts could not be loaded", async () => {
    fetchAdminCourts.mockRejectedValue(new Error("Could not load courts"));
    renderPage();

    expect(await screen.findByText("Could not load courts")).toBeInTheDocument();
  });

  it("shows each court's name and active status", async () => {
    fetchAdminCourts.mockResolvedValue([activeCourt, inactiveCourt]);
    renderPage();

    const items = await screen.findAllByRole("listitem");
    expect(within(items[0]).getByText("Court 1")).toBeInTheDocument();
    expect(within(items[0]).getByText("Active")).toBeInTheDocument();
    expect(within(items[1]).getByText("Court 2")).toBeInTheDocument();
    expect(within(items[1]).getByText("Inactive")).toBeInTheDocument();
  });

  it("shows Deactivate for an active court and Activate for an inactive one", async () => {
    fetchAdminCourts.mockResolvedValue([activeCourt, inactiveCourt]);
    renderPage();

    const items = await screen.findAllByRole("listitem");
    expect(within(items[0]).getByRole("button", { name: "Deactivate" })).toBeInTheDocument();
    expect(within(items[1]).getByRole("button", { name: "Activate" })).toBeInTheDocument();
  });

  it("renames a court", async () => {
    fetchAdminCourts.mockResolvedValue([activeCourt]);
    renameCourt.mockResolvedValue({ ...activeCourt, name: "Centre Court" });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Rename" }));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Centre Court" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Centre Court")).toBeInTheDocument();
    expect(renameCourt).toHaveBeenCalledWith(1, "Centre Court");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("deactivates a court with no future confirmed bookings, no notice shown", async () => {
    fetchAdminCourts.mockResolvedValue([activeCourt]);
    setCourtActive.mockResolvedValue({
      court: { ...activeCourt, isActive: false },
      futureConfirmedBookings: 0,
    });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Deactivate" }));

    expect(await screen.findByText("Inactive")).toBeInTheDocument();
    expect(setCourtActive).toHaveBeenCalledWith(1, false);
    expect(screen.queryByText(/confirmed booking/i)).not.toBeInTheDocument();
  });

  it("tells the admin how many confirmed bookings a deactivated court still has in the future", async () => {
    fetchAdminCourts.mockResolvedValue([activeCourt]);
    setCourtActive.mockResolvedValue({
      court: { ...activeCourt, isActive: false },
      futureConfirmedBookings: 3,
    });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Deactivate" }));

    expect(
      await screen.findByText(/still has 3 confirmed bookings in the future/i),
    ).toBeInTheDocument();
  });

  it("activates a court", async () => {
    fetchAdminCourts.mockResolvedValue([inactiveCourt]);
    setCourtActive.mockResolvedValue({ court: { ...inactiveCourt, isActive: true } });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Activate" }));

    expect(await screen.findByText("Active")).toBeInTheDocument();
    expect(setCourtActive).toHaveBeenCalledWith(2, true);
  });
});
