import { formatTime } from "../utils/formatSlot.js";

function slotState(slot, selectedStartTime) {
  if (slot.startTime === selectedStartTime) {
    return "selected";
  }
  if (slot.status === "taken") {
    return "taken";
  }
  if (new Date(slot.startTime).getTime() <= Date.now()) {
    return "past";
  }
  return "free";
}

const STATE_LABELS = {
  free: "Free",
  taken: "Booked",
  past: "Past",
  selected: "Selected",
};

const STATE_CLASSES = {
  free: "border border-border text-text hover:border-accent hover:text-accent",
  taken: "border border-border bg-border/30 text-text-muted",
  past: "border border-border text-text-muted/60",
  selected: "border border-accent bg-accent text-bg",
};

// One court's grid of slots for one day. Every cell shows its own state as
// text, not only as colour, so free, booked and past slots are never mixed
// up at a glance.
export default function SlotGrid({ courtId, courtName, slots, selectedStartTime, onSelectSlot }) {
  const hasFreeSlot = slots.some((slot) => slotState(slot, selectedStartTime) === "free");

  return (
    <div>
      <h3 className="mb-3 text-lg font-medium text-text">{courtName}</h3>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {slots.map((slot) => {
          const state = slotState(slot, selectedStartTime);
          return (
            <button
              key={slot.startTime}
              type="button"
              disabled={state !== "free" && state !== "selected"}
              onClick={() =>
                onSelectSlot({ courtId, startTime: slot.startTime, endTime: slot.endTime })
              }
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
