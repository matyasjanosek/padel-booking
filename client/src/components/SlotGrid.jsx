import { formatTime } from "../utils/formatSlot.js";
import { MIN_BOOKING_MINUTES } from "../constants/booking.js";

// A unit can be free on the server and still not fit any real booking, if
// not enough free units follow it before the next taken one or closing
// time. unitMinutes is only meaningful once availability has actually
// loaded; until then nothing is free yet, so there is nothing to mark.
function fitsNoDuration(slot, unitMinutes) {
  return (
    slot.status === "free" &&
    unitMinutes != null &&
    slot.maxUnits * unitMinutes < MIN_BOOKING_MINUTES
  );
}

function slotState(slot, selectedStartTime, unitMinutes) {
  if (slot.startTime === selectedStartTime) {
    return "selected";
  }
  if (slot.status === "taken") {
    return "taken";
  }
  if (new Date(slot.startTime).getTime() <= Date.now()) {
    return "past";
  }
  if (fitsNoDuration(slot, unitMinutes)) {
    return "partial";
  }
  return "free";
}

const STATE_LABELS = {
  free: "Free",
  taken: "Booked",
  past: "Past",
  selected: "Selected",
  partial: "Under 1h",
};

const STATE_CLASSES = {
  free: "border border-border text-text hover:border-accent hover:text-accent",
  taken: "border border-border bg-border/30 text-text-muted",
  past: "border border-border text-text-muted/60",
  selected: "border border-accent bg-accent text-bg",
  partial: "border border-dashed border-border text-text-muted",
};

// One court's grid of units for one day. Every cell shows its own state as
// text, not only as colour, so free, booked, past and under-an-hour units
// are never mixed up at a glance.
//
// A unit under an hour is free on the server, nothing is booked there, but
// no booking can actually start there. It used to look identical to a free
// unit and only revealed itself as a dead end after being clicked. It is
// still a plain, focusable button, not one with the disabled attribute: a
// disabled element drops out of the keyboard tab order entirely, so a
// keyboard or screen reader user would skip straight over it and never
// learn why that time is unavailable. aria-disabled keeps it reachable and
// its own accessible name says why, the click itself is simply ignored.
export default function SlotGrid({
  courtId,
  courtName,
  slots,
  unitMinutes,
  selectedStartTime,
  onSelectSlot,
}) {
  const hasFreeSlot = slots.some(
    (slot) => slotState(slot, selectedStartTime, unitMinutes) === "free",
  );

  return (
    <div>
      <h3 className="mb-3 text-lg font-medium text-text">{courtName}</h3>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {slots.map((slot) => {
          const state = slotState(slot, selectedStartTime, unitMinutes);
          const selectable = state === "free" || state === "selected";
          return (
            <button
              key={slot.startTime}
              type="button"
              disabled={!selectable && state !== "partial"}
              aria-disabled={state === "partial" ? "true" : undefined}
              aria-label={
                state === "partial"
                  ? `${formatTime(slot.startTime)}, under one hour free, too short for a booking`
                  : undefined
              }
              onClick={() => {
                if (!selectable) return;
                onSelectSlot({ courtId, startTime: slot.startTime, maxUnits: slot.maxUnits });
              }}
              className={`rounded-lg px-2 py-2.5 text-center transition-colors duration-200 disabled:cursor-default ${STATE_CLASSES[state]}`}
            >
              <span className="block text-sm font-medium">{formatTime(slot.startTime)}</span>
              <span className="block text-[11px] uppercase tracking-wide">
                {STATE_LABELS[state]}
              </span>
            </button>
          );
        })}
      </div>
      {!hasFreeSlot && (
        <p className="mt-3 text-sm text-text-muted">No free slots left on this day.</p>
      )}
    </div>
  );
}
