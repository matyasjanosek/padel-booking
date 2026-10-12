import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminBookings from "./AdminBookings.jsx";

vi.mock("../api/adminBookings.js", () => ({
  fetchAdminBookings: vi.fn(),
  rescheduleBooking: vi.fn(),
  cancelBookingAsAdmin: vi.fn(),
}));
vi.mock("../api/courts.js", () => ({
  fetchCourts: vi.fn(),
}));
vi.mock("../api/availability.js", () => ({
  fetchAvailability: vi.fn(),
}));

import {
  fetchAdminBookings,
  rescheduleBooking,
  cancelBookingAsAdmin,
} from "../api/adminBookings.js";
import { fetchCourts } from "../api/courts.js";
import { fetchAvailability } from "../api/availability.js";

const pendingBooking = {
  id: 1,
  user: { id: 5, name: "Alex", email: "alex@example.com" },
  courtId: 1,
  courtName: "Court 1",
  startTime: "2030-06-10T09:00:00.000+02:00",
  endTime: "2030-06-10T10:00:00.000+02:00",
  status: "pending",
  price: 400,
  gateCode: null,
};

const cancelledBooking = { ...pendingBooking, id: 2, status: "cancelled" };

function renderPage() {
  render(
    <MemoryRouter>
      <AdminBookings />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchCourts.mockResolvedValue([
    { id: 1, name: "Court 1" },
    { id: 2, name: "Court 2" },
  ]);
});

describe("AdminBookings", () => {
  it("shows a loading message while the bookings have not arrived yet", () => {
    fetchAdminBookings.mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByText(/loading bookings/i)).toBeInTheDocument();
  });

  it("shows an error when the bookings could not be loaded", async () => {
    fetchAdminBookings.mockRejectedValue(new Error("Could not load the bookings"));
    renderPage();

    expect(await screen.findByText("Could not load the bookings")).toBeInTheDocument();
  });

  it("shows a message when no bookings match the filters", async () => {
    fetchAdminBookings.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText(/no bookings match/i)).toBeInTheDocument();
  });

  it("shows each booking's player, court, time, status and price", async () => {
    fetchAdminBookings.mockResolvedValue([pendingBooking]);
    renderPage();

    const row = (await screen.findAllByRole("row"))[1];
    expect(within(row).getByText("Alex")).toBeInTheDocument();
    expect(within(row).getByText("alex@example.com")).toBeInTheDocument();
    expect(within(row).getByText("Court 1")).toBeInTheDocument();
    expect(within(row).getByText("Pending")).toBeInTheDocument();
    expect(within(row).getByText("400 CZK")).toBeInTheDocument();
  });

  it("refetches with the chosen filters", async () => {
    fetchAdminBookings.mockResolvedValue([]);
    renderPage();
    await screen.findByText(/no bookings match/i);

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "confirmed" } });

    await screen.findByText(/no bookings match/i);
    expect(fetchAdminBookings).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "confirmed" }),
    );
  });

  it("shows Clear filters only once a filter is active, and clears them", async () => {
    fetchAdminBookings.mockResolvedValue([]);
    renderPage();
    await screen.findByText(/no bookings match/i);

    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "confirmed" } });
    await screen.findByRole("button", { name: "Clear filters" });

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(screen.getByLabelText("Status")).toHaveValue("");
  });

  it("shows Change and Cancel for a pending booking but neither for a cancelled one", async () => {
    fetchAdminBookings.mockResolvedValue([pendingBooking, cancelledBooking]);
    renderPage();

    const rows = await screen.findAllByRole("row");
    // rows[0] is the header row.
    expect(within(rows[1]).getByRole("button", { name: "Change" })).toBeInTheDocument();
    expect(within(rows[1]).getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(within(rows[2]).queryByRole("button", { name: "Change" })).not.toBeInTheDocument();
    expect(within(rows[2]).queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("does not cancel on the first click, it asks for confirmation first", async () => {
    fetchAdminBookings.mockResolvedValue([pendingBooking]);
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(await screen.findByText("Cancel this booking?")).toBeInTheDocument();
    expect(cancelBookingAsAdmin).not.toHaveBeenCalled();
  });

  it("cancels the booking once confirmed and shows it as cancelled", async () => {
    fetchAdminBookings.mockResolvedValue([pendingBooking]);
    cancelBookingAsAdmin.mockResolvedValue({ ...pendingBooking, status: "cancelled" });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    fireEvent.click(await screen.findByRole("button", { name: "Yes, cancel" }));

    expect(cancelBookingAsAdmin).toHaveBeenCalledWith(1);
    expect(await screen.findByText("Cancelled")).toBeInTheDocument();
  });

  it("opens a reschedule form with court, date and time controls", async () => {
    fetchAdminBookings.mockResolvedValue([pendingBooking]);
    fetchAvailability.mockReturnValue(new Promise(() => {}));
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Change" }));

    await screen.findByLabelText("Time");
    expect(screen.getAllByLabelText("Court")).toHaveLength(2); // the filter, and this form
    expect(screen.getAllByLabelText("Date").at(-1)).toHaveValue("2030-06-10");
  });

  it("offers each slot for the chosen court and date, taken ones disabled", async () => {
    fetchAdminBookings.mockResolvedValue([pendingBooking]);
    fetchAvailability.mockResolvedValue({
      slots: [
        {
          startTime: "2030-06-10T09:00:00.000+02:00",
          endTime: "2030-06-10T10:00:00.000+02:00",
          status: "free",
        },
        {
          startTime: "2030-06-10T10:00:00.000+02:00",
          endTime: "2030-06-10T11:00:00.000+02:00",
          status: "taken",
        },
      ],
    });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Change" }));
    await screen.findByLabelText("Time");

    const timeSelect = screen.getByLabelText("Time");
    const options = within(timeSelect).getAllByRole("option");
    expect(options[1]).toHaveTextContent("09:00");
    expect(options[2]).toHaveTextContent("10:00 (taken)");
    expect(options[2]).toBeDisabled();
  });

  it("saves a reschedule and shows the updated booking", async () => {
    fetchAdminBookings.mockResolvedValue([pendingBooking]);
    fetchAvailability.mockResolvedValue({
      slots: [
        {
          startTime: "2030-06-10T09:00:00.000+02:00",
          endTime: "2030-06-10T10:00:00.000+02:00",
          status: "free",
        },
      ],
    });
    rescheduleBooking.mockResolvedValue({
      ...pendingBooking,
      courtName: "Court 2",
      courtId: 2,
    });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Change" }));
    await screen.findByLabelText("Time");
    // Changing the court re-fetches availability and resets the time choice,
    // so the court must be picked before the time, not after.
    fireEvent.change(screen.getAllByLabelText("Court").at(-1), { target: { value: "2" } });
    await screen.findByLabelText("Time");
    fireEvent.change(screen.getByLabelText("Time"), {
      target: { value: "2030-06-10T09:00:00.000+02:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("cell", { name: "Court 2" })).toBeInTheDocument();
    expect(rescheduleBooking).toHaveBeenCalledWith(1, {
      courtId: 2,
      startTime: "2030-06-10T09:00:00.000+02:00",
    });
    expect(screen.queryByLabelText("Time")).not.toBeInTheDocument();
  });
});
