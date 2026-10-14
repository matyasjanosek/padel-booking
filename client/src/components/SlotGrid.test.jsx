import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SlotGrid from "./SlotGrid.jsx";

const UNIT_MINUTES = 30;

function renderGrid(slots, props = {}) {
  const onSelectSlot = vi.fn();
  render(
    <SlotGrid
      courtId={1}
      courtName="Court 1"
      slots={slots}
      unitMinutes={UNIT_MINUTES}
      selectedStartTime={null}
      onSelectSlot={onSelectSlot}
      {...props}
    />,
  );
  return onSelectSlot;
}

describe("SlotGrid", () => {
  it("shows a free unit as free and selectable", () => {
    const onSelectSlot = renderGrid([
      { startTime: "2030-06-10T09:00:00.000+02:00", status: "free", maxUnits: 4 },
    ]);

    const button = screen.getByText("Free").closest("button");
    expect(button).not.toBeDisabled();
    expect(button).not.toHaveAttribute("aria-disabled");

    fireEvent.click(button);
    expect(onSelectSlot).toHaveBeenCalledWith({
      courtId: 1,
      startTime: "2030-06-10T09:00:00.000+02:00",
      maxUnits: 4,
    });
  });

  it("shows the currently selected start as Selected, not Free", () => {
    renderGrid([{ startTime: "2030-06-10T09:00:00.000+02:00", status: "free", maxUnits: 4 }], {
      selectedStartTime: "2030-06-10T09:00:00.000+02:00",
    });

    expect(screen.getByText("Selected")).toBeInTheDocument();
    expect(screen.queryByText("Free")).not.toBeInTheDocument();
  });

  it("shows a taken unit as Booked, disabled with the native attribute", () => {
    const onSelectSlot = renderGrid([
      { startTime: "2030-06-10T09:00:00.000+02:00", status: "taken" },
    ]);

    const button = screen.getByText("Booked").closest("button");
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(onSelectSlot).not.toHaveBeenCalled();
  });

  it("shows a unit in the past as Past, disabled with the native attribute", () => {
    renderGrid([{ startTime: "2020-01-01T09:00:00.000+01:00", status: "free", maxUnits: 4 }]);

    expect(screen.getByText("Past").closest("button")).toBeDisabled();
  });

  it("shows a unit too short for any booking as Under 1h, focusable but not selectable", () => {
    const onSelectSlot = renderGrid([
      { startTime: "2030-06-10T09:00:00.000+02:00", status: "free", maxUnits: 1 },
    ]);

    const button = screen.getByText("Under 1h").closest("button");

    // Not the disabled attribute: that would drop it from the keyboard tab
    // order entirely, so a keyboard or screen reader user would skip
    // straight over it and never learn why that time is unavailable.
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAccessibleName("09:00, under one hour free, too short for a booking");

    fireEvent.click(button);
    expect(onSelectSlot).not.toHaveBeenCalled();
  });

  it("does not mark a unit Under 1h before availability, with its unitMinutes, has loaded", () => {
    renderGrid([{ startTime: "2030-06-10T09:00:00.000+02:00", status: "free", maxUnits: 1 }], {
      unitMinutes: null,
    });

    expect(screen.queryByText("Under 1h")).not.toBeInTheDocument();
    expect(screen.getByText("Free")).toBeInTheDocument();
  });

  it("treats Under 1h the same as no free units left for the empty state message", () => {
    renderGrid([{ startTime: "2030-06-10T09:00:00.000+02:00", status: "free", maxUnits: 1 }]);

    expect(screen.getByText("No free slots left on this day.")).toBeInTheDocument();
  });
});
