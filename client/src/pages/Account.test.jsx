import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Account from "./Account.jsx";

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: vi.fn(),
}));
vi.mock("../api/bookings.js", () => ({
  fetchMyBookings: vi.fn(),
  cancelBooking: vi.fn(),
}));
vi.mock("../api/courts.js", () => ({
  fetchCourts: vi.fn(),
}));

import { useAuth } from "../context/AuthContext.jsx";
import { fetchMyBookings, cancelBooking } from "../api/bookings.js";
import { fetchCourts } from "../api/courts.js";

const pendingBooking = {
  id: 1,
  courtId: 1,
  startTime: "2030-06-10T09:00:00.000+02:00",
  endTime: "2030-06-10T10:00:00.000+02:00",
  status: "pending",
  price: 400,
  holdExpiresAt: "2030-06-10T08:10:00.000+02:00",
};

const cancelledBooking = {
  ...pendingBooking,
  id: 2,
  status: "cancelled",
  holdExpiresAt: null,
};

const confirmedUpcomingBooking = {
  ...pendingBooking,
  id: 3,
  status: "confirmed",
  holdExpiresAt: null,
  gateCode: "482913",
  gateCodeValidFrom: "2031-06-10T17:40:00.000+02:00",
  gateCodeValidUntil: "2031-06-10T18:45:00.000+02:00",
};

const confirmedPastBooking = {
  ...confirmedUpcomingBooking,
  id: 4,
  gateCode: "111222",
  gateCodeValidFrom: "2020-06-10T17:40:00.000+02:00",
  gateCodeValidUntil: "2020-06-10T18:45:00.000+02:00",
};

function renderAccount() {
  render(
    <MemoryRouter>
      <Account />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.mockReturnValue({ user: { name: "Alex", email: "alex@example.com" } });
  fetchCourts.mockResolvedValue([{ id: 1, name: "Court 1" }]);
});

describe("Account", () => {
  it("shows the logged in user's name and email", async () => {
    fetchMyBookings.mockResolvedValue([]);
    renderAccount();

    expect(screen.getByRole("heading", { level: 1, name: "Account" })).toBeInTheDocument();
    expect(screen.getByText("Alex")).toBeInTheDocument();
    expect(screen.getByText("alex@example.com")).toBeInTheDocument();
    await screen.findByText(/you have no bookings yet/i);
  });

  it("shows a loading message while the bookings have not arrived yet", () => {
    fetchMyBookings.mockReturnValue(new Promise(() => {}));
    renderAccount();

    expect(screen.getByText(/loading your bookings/i)).toBeInTheDocument();
  });

  it("shows a message when there are no bookings", async () => {
    fetchMyBookings.mockResolvedValue([]);
    renderAccount();

    expect(await screen.findByText(/you have no bookings yet/i)).toBeInTheDocument();
  });

  it("shows an error when bookings could not be loaded", async () => {
    fetchMyBookings.mockRejectedValue(new Error("network down"));
    renderAccount();

    expect(await screen.findByText(/could not be loaded/i)).toBeInTheDocument();
  });

  it("shows the court name, the slot and the status for each booking", async () => {
    fetchMyBookings.mockResolvedValue([pendingBooking]);
    renderAccount();

    expect(
      await screen.findByText(/Court 1, Mon, 10 Jun 2030, 09:00 to 10:00/),
    ).toBeInTheDocument();
    const status = screen.getByText("Pending");
    expect(status.closest("p").textContent).toBe("Pending · 400 CZK");
  });

  it("marks the status with a word, not colour alone: Confirmed is bold and accent, Pending bold but not accent, Cancelled and Expired muted", async () => {
    fetchMyBookings.mockResolvedValue([
      pendingBooking,
      cancelledBooking,
      confirmedUpcomingBooking,
      { ...pendingBooking, id: 5, status: "expired" },
    ]);
    renderAccount();

    expect((await screen.findByText("Pending")).className).toBe("font-semibold text-text");
    expect(screen.getByText("Cancelled").className).toBe("text-text-muted");
    expect(screen.getByText("Confirmed").className).toBe("font-semibold text-accent");
    expect(screen.getByText("Expired").className).toBe("text-text-muted");
  });

  it("shows a Cancel button for a pending booking but not for a cancelled one", async () => {
    fetchMyBookings.mockResolvedValue([pendingBooking, cancelledBooking]);
    renderAccount();

    const items = await screen.findAllByRole("listitem");
    expect(within(items[0]).getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(within(items[1]).queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("shows a Pay now link for a pending booking but not for a cancelled one", async () => {
    fetchMyBookings.mockResolvedValue([pendingBooking, cancelledBooking]);
    renderAccount();

    const items = await screen.findAllByRole("listitem");
    const payLink = within(items[0]).getByRole("link", { name: "Pay now" });
    expect(payLink).toHaveAttribute("href", "/booking/1/checkout");
    expect(within(items[1]).queryByRole("link", { name: "Pay now" })).not.toBeInTheDocument();
  });

  it("does not cancel on the first click, it asks for confirmation first", async () => {
    fetchMyBookings.mockResolvedValue([pendingBooking]);
    renderAccount();

    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(await screen.findByText("Cancel this booking?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yes, cancel" })).toBeInTheDocument();
    expect(cancelBooking).not.toHaveBeenCalled();
  });

  it("warns that a paid booking will not be refunded before confirming", async () => {
    fetchMyBookings.mockResolvedValue([confirmedUpcomingBooking]);
    renderAccount();

    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(
      await screen.findByText("This booking is paid and will not be refunded."),
    ).toBeInTheDocument();
  });

  it("does not show the refund warning for a pending, unpaid booking", async () => {
    fetchMyBookings.mockResolvedValue([pendingBooking]);
    renderAccount();

    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    await screen.findByText("Cancel this booking?");

    expect(screen.queryByText(/will not be refunded/i)).not.toBeInTheDocument();
  });

  it("dismisses the confirmation without cancelling when the user says no", async () => {
    fetchMyBookings.mockResolvedValue([pendingBooking]);
    renderAccount();

    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    fireEvent.click(await screen.findByRole("button", { name: "No" }));

    expect(screen.queryByText("Cancel this booking?")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(cancelBooking).not.toHaveBeenCalled();
  });

  it("cancels a booking once confirmed and shows it as cancelled", async () => {
    fetchMyBookings.mockResolvedValue([pendingBooking]);
    cancelBooking.mockResolvedValue({ ...pendingBooking, status: "cancelled" });
    renderAccount();

    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    fireEvent.click(await screen.findByRole("button", { name: "Yes, cancel" }));

    expect(cancelBooking).toHaveBeenCalledWith(1);
    const status = await screen.findByText("Cancelled");
    expect(status.closest("p").textContent).toBe("Cancelled · 400 CZK");
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("shows an error when cancelling fails", async () => {
    fetchMyBookings.mockResolvedValue([pendingBooking]);
    cancelBooking.mockRejectedValue(new Error("This booking cannot be cancelled"));
    renderAccount();

    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    fireEvent.click(await screen.findByRole("button", { name: "Yes, cancel" }));

    expect(await screen.findByText("This booking cannot be cancelled")).toBeInTheDocument();
  });

  it("shows the gate code as the prominent element, with its window as quiet support text", async () => {
    fetchMyBookings.mockResolvedValue([confirmedUpcomingBooking]);
    renderAccount();

    const code = await screen.findByText("482913");
    expect(code.className).toContain("numeral");
    expect(code.className).toContain("text-2xl");
    expect(screen.getByText("Works at the gate from 17:40 until 18:45.")).toBeInTheDocument();
  });

  it("keeps the gate code's own help text quiet, not full contrast", async () => {
    fetchMyBookings.mockResolvedValue([confirmedUpcomingBooking]);
    renderAccount();

    await screen.findByText("482913");
    const howTo = screen.getByText(/enter this code on the keypad outside/i);
    const emailNote = screen.getByText("You can also find this code in your confirmation email.");
    expect(howTo.className).toContain("text-text-muted");
    expect(emailNote.className).toContain("text-text-muted");
  });

  it("never shows a gate code for a pending or a cancelled booking", async () => {
    fetchMyBookings.mockResolvedValue([pendingBooking, cancelledBooking]);
    renderAccount();

    await screen.findByText("Pending");
    expect(screen.queryByText(/^\d{6}$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/keypad outside/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/confirmation email/i)).not.toBeInTheDocument();
  });

  it("keeps an upcoming gate code in accent green", async () => {
    fetchMyBookings.mockResolvedValue([confirmedUpcomingBooking]);
    renderAccount();

    const code = await screen.findByText("482913");
    expect(code.className).toBe("numeral text-2xl text-accent");
  });

  it("mutes a past booking's gate code instead of hiding it", async () => {
    fetchMyBookings.mockResolvedValue([confirmedPastBooking]);
    renderAccount();

    const code = await screen.findByText("111222");
    expect(code.className).toBe("numeral text-2xl text-text-muted");
  });
});
