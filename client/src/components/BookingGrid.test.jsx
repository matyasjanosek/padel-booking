import { describe, it, expect, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import BookingGrid from "./BookingGrid.jsx";

const COURTS = [{ id: 1, name: "Court 1" }];
const BAND = { key: "morning", label: "Morning", startHour: 6, endHour: 12 };

// The legend repeats "Free" and "Booked" as plain labels, so every text
// query here is scoped to the table itself, not the whole rendered output.
function renderGrid(slots, props = {}) {
  const onSelectSlot = vi.fn();
  const onDeselectSlot = vi.fn();
  render(
    <BookingGrid
      courts={COURTS}
      slotsByCourtId={{ 1: { slots } }}
      unitMinutes={30}
      band={BAND}
      selectedSlot={null}
      durationMinutes={null}
      onSelectSlot={onSelectSlot}
      onDeselectSlot={onDeselectSlot}
      {...props}
    />,
  );
  return { onSelectSlot, onDeselectSlot, table: within(screen.getByRole("table")) };
}

describe("BookingGrid", () => {
  it("shows a free unit as free and selectable", () => {
    const { onSelectSlot, table } = renderGrid([
      { startTime: "2030-06-10T09:00:00.000+02:00", status: "free", maxUnits: 4 },
    ]);

    const button = table.getByText("Free").closest("button");
    expect(button).not.toBeDisabled();
    expect(button).not.toHaveAttribute("aria-disabled");

    fireEvent.click(button);
    expect(onSelectSlot).toHaveBeenCalledWith({
      courtId: 1,
      startTime: "2030-06-10T09:00:00.000+02:00",
      maxUnits: 4,
    });
  });

  it("shows the currently selected start as its own time, not Free", () => {
    const { table } = renderGrid(
      [{ startTime: "2030-06-10T09:00:00.000+02:00", status: "free", maxUnits: 4 }],
      { selectedSlot: { courtId: 1, startTime: "2030-06-10T09:00:00.000+02:00" } },
    );

    expect(table.getByText("09:00 start")).toBeInTheDocument();
    expect(table.queryByText("Free")).not.toBeInTheDocument();
  });

  it("shows a taken unit as Booked, disabled with the native attribute", () => {
    const { onSelectSlot, table } = renderGrid([
      { startTime: "2030-06-10T09:00:00.000+02:00", status: "taken" },
    ]);

    const button = table.getByText("Booked").closest("button");
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(onSelectSlot).not.toHaveBeenCalled();
  });

  it("shows a unit in the past as Past, disabled with the native attribute", () => {
    const { table } = renderGrid([
      { startTime: "2020-01-01T09:00:00.000+01:00", status: "free", maxUnits: 4 },
    ]);

    expect(table.getByText("Past").closest("button")).toBeDisabled();
  });

  it("shows a unit too short for any booking as Under 1h, focusable but not selectable", () => {
    const { onSelectSlot, table } = renderGrid([
      { startTime: "2030-06-10T09:00:00.000+02:00", status: "free", maxUnits: 1 },
    ]);

    const button = table.getByText("Under 1h").closest("button");

    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAccessibleName(
      "Court 1, 09:00, under one hour free, too short for a booking",
    );

    fireEvent.click(button);
    expect(onSelectSlot).not.toHaveBeenCalled();
  });

  it("does not mark a unit Under 1h before availability, with its unitMinutes, has loaded", () => {
    const { table } = renderGrid(
      [{ startTime: "2030-06-10T09:00:00.000+02:00", status: "free", maxUnits: 1 }],
      { unitMinutes: null },
    );

    expect(table.queryByText("Under 1h")).not.toBeInTheDocument();
    expect(table.getByText("Free")).toBeInTheDocument();
  });

  it("treats Under 1h the same as no free units left for the empty state message", () => {
    renderGrid([{ startTime: "2030-06-10T09:00:00.000+02:00", status: "free", maxUnits: 1 }]);

    expect(screen.getByText("No free slots left in this band.")).toBeInTheDocument();
  });
});
