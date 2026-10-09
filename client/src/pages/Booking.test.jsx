import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Booking from "./Booking.jsx";

const navigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigate };
});

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: vi.fn(),
}));
vi.mock("../api/courts.js", () => ({
  fetchCourts: vi.fn(),
}));
vi.mock("../api/availability.js", () => ({
  fetchAvailability: vi.fn(),
}));
vi.mock("../api/bookings.js", () => ({
  createBooking: vi.fn(),
}));

import { useAuth } from "../context/AuthContext.jsx";
import { fetchCourts } from "../api/courts.js";
import { fetchAvailability } from "../api/availability.js";
import { createBooking } from "../api/bookings.js";

const COURTS = [
  { id: 1, name: "Court 1" },
  { id: 2, name: "Court 2" },
];

const freeSlot = {
  startTime: "2030-06-10T07:00:00.000+02:00",
  endTime: "2030-06-10T08:00:00.000+02:00",
  status: "free",
};
const takenSlot = {
  startTime: "2030-06-10T08:00:00.000+02:00",
  endTime: "2030-06-10T09:00:00.000+02:00",
  status: "taken",
};
const pastFreeSlot = {
  startTime: "2020-01-01T07:00:00.000+01:00",
  endTime: "2020-01-01T08:00:00.000+01:00",
  status: "free",
};

function renderBooking(initialEntries = ["/booking?date=2030-06-10"]) {
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Booking />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.mockReturnValue({ user: { id: 1, name: "Alex" } });
  fetchCourts.mockResolvedValue(COURTS);
  fetchAvailability.mockImplementation(({ courtId, date }) =>
    Promise.resolve({
      date,
      courtId,
      price: 400,
      slots: courtId === 1 ? [freeSlot, takenSlot, pastFreeSlot] : [freeSlot],
    }),
  );
});

describe("Booking", () => {
  it("shows a loading state while availability is being fetched", async () => {
    fetchAvailability.mockReturnValue(new Promise(() => {}));
    renderBooking();

    expect(await screen.findByText(/loading availability/i)).toBeInTheDocument();
  });

  it("shows both courts with free and taken slots clearly separated", async () => {
    renderBooking();

    expect(await screen.findByRole("heading", { name: "Court 1", level: 3 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Court 2", level: 3 })).toBeInTheDocument();
    expect(screen.getAllByText("Free").length).toBeGreaterThan(0);
    expect(screen.getByText("Booked")).toBeInTheDocument();
  });

  it("disables a past slot separately from a taken one", async () => {
    renderBooking();
    await screen.findByRole("heading", { name: "Court 1", level: 3 });

    expect(screen.getByText("Past").closest("button")).toBeDisabled();
    expect(screen.getByText("Booked").closest("button")).toBeDisabled();
  });

  it("shows a clear empty state when a court has no free slots left", async () => {
    fetchAvailability.mockImplementation(({ courtId, date }) =>
      Promise.resolve({ date, courtId, price: 400, slots: [takenSlot] }),
    );
    renderBooking();

    expect(await screen.findAllByText("No free slots left on this day.")).toHaveLength(2);
  });

  it("sends a logged out visitor to log in first, remembering where they were", async () => {
    useAuth.mockReturnValue({ user: null });
    renderBooking(["/booking?date=2030-06-10"]);

    const freeButton = (await screen.findAllByText("Free"))[0].closest("button");
    fireEvent.click(freeButton);

    expect(navigate).toHaveBeenCalledWith("/login", {
      state: { from: "/booking?date=2030-06-10" },
    });
    expect(createBooking).not.toHaveBeenCalled();
  });

  it("shows the court, time and price before booking", async () => {
    renderBooking();

    const freeButton = (await screen.findAllByText("Free"))[0].closest("button");
    fireEvent.click(freeButton);

    expect(await screen.findByText(/Court 1,/)).toBeInTheDocument();
    expect(screen.getByText("400 CZK")).toBeInTheDocument();
  });

  it("books the slot on confirm and goes to checkout", async () => {
    createBooking.mockResolvedValue({ id: 42 });
    renderBooking();

    fireEvent.click((await screen.findAllByText("Free"))[0].closest("button"));
    fireEvent.click(screen.getByRole("button", { name: "Confirm booking" }));

    await waitFor(() =>
      expect(createBooking).toHaveBeenCalledWith({ courtId: 1, startTime: freeSlot.startTime }),
    );
    expect(navigate).toHaveBeenCalledWith("/booking/42/checkout");
  });

  it("shows the server's message and refreshes availability when someone else took the slot first", async () => {
    createBooking.mockRejectedValue(new Error("That slot was just taken. Pick another one."));
    renderBooking();

    fireEvent.click((await screen.findAllByText("Free"))[0].closest("button"));
    fireEvent.click(screen.getByRole("button", { name: "Confirm booking" }));

    expect(
      await screen.findByText("That slot was just taken. Pick another one."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm booking" })).not.toBeInTheDocument();
    // once per court on mount, then again per court after the failed attempt
    await waitFor(() => expect(fetchAvailability).toHaveBeenCalledTimes(4));
  });

  it("moves to the next day and fetches that day's availability", async () => {
    renderBooking();
    await screen.findByRole("heading", { name: "Court 1", level: 3 });

    fireEvent.click(screen.getByRole("button", { name: /next day/i }));

    await waitFor(() =>
      expect(fetchAvailability).toHaveBeenCalledWith({ courtId: 1, date: "2030-06-11" }),
    );
  });

  it("disables moving to a day before today", async () => {
    renderBooking(["/booking"]);
    await screen.findByRole("heading", { name: "Court 1", level: 3 });

    expect(screen.getByRole("button", { name: /previous day/i })).toBeDisabled();
  });
});
