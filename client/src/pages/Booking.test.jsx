import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
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

// All in the Morning band (06-12), so they show without switching tabs: a
// fixture date far in the future defaults the page to Morning.
// maxUnits: 4 means two hours are free after this start, enough for every
// duration up to 2h.
const freeSlot = {
  startTime: "2030-06-10T07:00:00.000+02:00",
  endTime: "2030-06-10T07:30:00.000+02:00",
  status: "free",
  maxUnits: 4,
};
// Free, but only this one unit, below the one hour minimum: no duration
// fits starting here.
const tooShortSlot = {
  startTime: "2030-06-10T07:30:00.000+02:00",
  endTime: "2030-06-10T08:00:00.000+02:00",
  status: "free",
  maxUnits: 1,
};
const takenSlot = {
  startTime: "2030-06-10T08:00:00.000+02:00",
  endTime: "2030-06-10T08:30:00.000+02:00",
  status: "taken",
};
// A different hour from the others, in the past, so it never collides with
// a same-named row from the 2030 fixtures above.
const pastFreeSlot = {
  startTime: "2020-01-01T09:00:00.000+01:00",
  endTime: "2020-01-01T09:30:00.000+01:00",
  status: "free",
  maxUnits: 4,
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
      unitMinutes: 30,
      pricePerHour: 400,
      slots: courtId === 1 ? [freeSlot, takenSlot, pastFreeSlot] : [freeSlot, takenSlot],
    }),
  );
});

describe("Booking", () => {
  it("shows a loading state while availability is being fetched", async () => {
    fetchAvailability.mockReturnValue(new Promise(() => {}));
    renderBooking();

    expect(await screen.findByText(/loading availability/i)).toBeInTheDocument();
  });

  it("shows both courts as grid columns, with free and taken slots", async () => {
    renderBooking();

    expect(await screen.findByRole("columnheader", { name: "Court 1" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Court 2" })).toBeInTheDocument();
    expect(screen.getAllByText("Free").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Booked").length).toBeGreaterThan(0);
  });

  it("disables a past slot separately from a taken one", async () => {
    renderBooking();
    await screen.findByRole("columnheader", { name: "Court 1" });

    expect(screen.getByText("Past").closest("button")).toBeDisabled();
    expect(screen.getAllByText("Booked")[0].closest("button")).toBeDisabled();
  });

  it("shows a clear empty state when the band has no free slots", async () => {
    fetchAvailability.mockImplementation(({ courtId, date }) =>
      Promise.resolve({ date, courtId, unitMinutes: 30, pricePerHour: 400, slots: [takenSlot] }),
    );
    renderBooking();

    expect(await screen.findByText("No free slots left in this band.")).toBeInTheDocument();
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

  it("shows the court, time range and price for the default, shortest duration", async () => {
    renderBooking();

    const freeButton = (await screen.findAllByText("Free"))[0].closest("button");
    fireEvent.click(freeButton);

    expect(await screen.findByText(/Court 1 ·/)).toBeInTheDocument();
    expect(screen.getByText("07:00–08:00")).toBeInTheDocument();
    expect(screen.getByText("400 CZK")).toBeInTheDocument();
  });

  it("offers every length up to the longest that fits, and prices each one", async () => {
    renderBooking();

    fireEvent.click((await screen.findAllByText("Free"))[0].closest("button"));
    const lengthGroup = screen.getByRole("group", { name: "Booking length" });
    const chips = within(lengthGroup).getAllByRole("button");
    expect(chips.map((chip) => chip.textContent)).toEqual(["1h", "1h 30", "2h"]);

    fireEvent.click(within(lengthGroup).getByRole("button", { name: "2h" }));

    expect(screen.getByText("800 CZK")).toBeInTheDocument();
  });

  it("marks a unit too short for any booking as Under 1h, focusable but not selectable", async () => {
    fetchAvailability.mockImplementation(({ courtId, date }) =>
      Promise.resolve({
        date,
        courtId,
        unitMinutes: 30,
        pricePerHour: 400,
        slots: [tooShortSlot],
      }),
    );
    renderBooking();

    const tooShortButton = (await screen.findAllByText("Under 1h"))[0].closest("button");

    expect(tooShortButton).not.toBeDisabled();
    expect(tooShortButton).toHaveAttribute("aria-disabled", "true");
    expect(tooShortButton).toHaveAccessibleName(/under one hour free/i);

    fireEvent.click(tooShortButton);

    expect(
      screen.getByText("Pick a free slot on the grid to start your booking."),
    ).toBeInTheDocument();
  });

  it("books the slot on confirm and goes to checkout", async () => {
    createBooking.mockResolvedValue({ id: 42 });
    renderBooking();

    fireEvent.click((await screen.findAllByText("Free"))[0].closest("button"));
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));

    await waitFor(() =>
      expect(createBooking).toHaveBeenCalledWith({
        courtId: 1,
        startTime: freeSlot.startTime,
        durationMinutes: 60,
        couponCode: undefined,
      }),
    );
    expect(navigate).toHaveBeenCalledWith("/booking/42/checkout");
  });

  it("sends the chosen length and a trimmed coupon code along with the booking", async () => {
    createBooking.mockResolvedValue({ id: 42 });
    renderBooking();

    fireEvent.click((await screen.findAllByText("Free"))[0].closest("button"));
    const lengthGroup = screen.getByRole("group", { name: "Booking length" });
    fireEvent.click(within(lengthGroup).getByRole("button", { name: "1h 30" }));
    fireEvent.change(await screen.findByLabelText(/coupon code/i), {
      target: { value: "  summer10  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));

    await waitFor(() =>
      expect(createBooking).toHaveBeenCalledWith({
        courtId: 1,
        startTime: freeSlot.startTime,
        durationMinutes: 90,
        couponCode: "summer10",
      }),
    );
  });

  it("shows the server's message and refreshes availability when someone else took the slot first", async () => {
    createBooking.mockRejectedValue(new Error("That slot was just taken. Pick another one."));
    renderBooking();

    fireEvent.click((await screen.findAllByText("Free"))[0].closest("button"));
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));

    expect(
      await screen.findByText("That slot was just taken. Pick another one."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continue to payment" })).not.toBeInTheDocument();
    // once per court on mount, then again per court after the failed attempt
    await waitFor(() => expect(fetchAvailability).toHaveBeenCalledTimes(4));
  });

  it("changes date and fetches availability for the newly chosen date", async () => {
    renderBooking();
    await screen.findByRole("columnheader", { name: "Court 1" });

    const dateInput = document.querySelector('input[type="date"]');
    fireEvent.change(dateInput, { target: { value: "2030-06-11" } });

    await waitFor(() =>
      expect(fetchAvailability).toHaveBeenCalledWith({ courtId: 1, date: "2030-06-11" }),
    );
  });

  it("disables moving to days before today", async () => {
    renderBooking(["/booking"]);
    await screen.findByRole("columnheader", { name: "Court 1" });

    expect(screen.getByRole("button", { name: "Earlier days" })).toBeDisabled();
  });

  it("highlights the court named in the court query param", async () => {
    renderBooking(["/booking?date=2030-06-10&court=2"]);

    const court1Header = await screen.findByRole("columnheader", { name: "Court 1" });
    const court2Header = screen.getByRole("columnheader", { name: "Court 2" });

    expect(court1Header.className).not.toContain("text-accent");
    expect(court2Header.className).toContain("text-accent");
  });
});
