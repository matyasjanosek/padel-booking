import { formatTime } from "../utils/formatSlot.js";
import { MIN_BOOKING_MINUTES } from "../constants/booking.js";

const STATE_TEXT = {
  free: "Free",
  taken: "Booked",
  past: "Past",
  partial: "Under 1h",
  covered: "included",
};

const STATE_CLASSES = {
  free: "border border-border bg-surface text-text hover:border-accent hover:text-accent",
  taken: "border border-border bg-border/20 text-text-muted",
  past: "border border-border bg-surface/50 text-text-muted/60",
  partial: "border border-dashed border-border text-text-muted",
  start: "border border-accent bg-accent text-bg font-semibold",
  covered: "border border-accent/50 bg-accent-dim text-accent font-semibold",
};

const STATE_ARIA = {
  free: "free",
  taken: "booked",
  past: "past",
  partial: "under one hour free, too short for a booking",
  start: "your start",
  covered: "included in your booking",
};

function fitsNoDuration(slot, unitMinutes) {
  return (
    slot.status === "free" &&
    unitMinutes != null &&
    slot.maxUnits * unitMinutes < MIN_BOOKING_MINUTES
  );
}

function isCovered(slotStartTime, selectionStartTime, durationMinutes) {
  const slotStart = new Date(slotStartTime).getTime();
  const selectionStart = new Date(selectionStartTime).getTime();
  const selectionEnd = selectionStart + durationMinutes * 60 * 1000;
  return slotStart > selectionStart && slotStart < selectionEnd;
}

function cellState(slot, { courtId, selectedSlot, durationMinutes, unitMinutes }) {
  const isSelectedCourt = selectedSlot?.courtId === courtId;
  if (isSelectedCourt && slot.startTime === selectedSlot.startTime) {
    return "start";
  }
  if (
    isSelectedCourt &&
    durationMinutes &&
    isCovered(slot.startTime, selectedSlot.startTime, durationMinutes)
  ) {
    return "covered";
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

const LEGEND = [
  { label: "Free", swatchClass: "border border-border bg-surface" },
  { label: "Booked", swatchClass: "border border-border bg-border/20" },
  { label: "Your start", swatchClass: "border border-accent bg-accent" },
  { label: "Your time", swatchClass: "border border-accent/50 bg-accent-dim" },
];

export default function BookingGrid({
  courts,
  slotsByCourtId,
  unitMinutes,
  band,
  preselectedCourtId,
  selectedSlot,
  durationMinutes,
  onSelectSlot,
  onDeselectSlot,
}) {
  const inBand = (slot) => {
    const hour = Number(formatTime(slot.startTime).split(":")[0]);
    return hour >= band.startHour && hour < band.endHour;
  };

  // Every court's own slots for the band, in time order; they all share the
  // same starts, so the first court with any slots sets the row times.
  const bandSlotsByCourtId = {};
  courts.forEach((court) => {
    bandSlotsByCourtId[court.id] = (slotsByCourtId[court.id]?.slots ?? []).filter(inBand);
  });
  const times = (bandSlotsByCourtId[courts[0]?.id] ?? []).map((slot) => slot.startTime);

  const hasFreeSlot = times.some((time) =>
    courts.some((court) => {
      const slot = bandSlotsByCourtId[court.id].find((item) => item.startTime === time);
      if (!slot) return false;
      const state = cellState(slot, {
        courtId: court.id,
        selectedSlot,
        durationMinutes,
        unitMinutes,
      });
      return state === "free" || state === "start" || state === "covered";
    }),
  );

  return (
    <div className="rounded-[22px] border border-border bg-surface p-5 sm:p-6">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.08em] text-text-muted">
              <th scope="col" className="w-16 py-3 pr-2 font-normal sm:w-20">
                Time
              </th>
              {courts.map((court) => (
                <th
                  key={court.id}
                  scope="col"
                  className={`px-2 py-3 font-normal ${
                    court.id === preselectedCourtId ? "text-accent" : ""
                  }`}
                >
                  {court.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {times.map((time) => {
              const isFullHour = formatTime(time).endsWith(":00");
              return (
                <tr key={time}>
                  <th
                    scope="row"
                    className={`py-1 pr-2 text-left align-middle text-sm font-normal tabular-nums ${
                      isFullHour ? "text-text" : "text-text-muted"
                    }`}
                  >
                    {formatTime(time)}
                  </th>
                  {courts.map((court) => {
                    const slot = bandSlotsByCourtId[court.id].find(
                      (item) => item.startTime === time,
                    );
                    if (!slot) {
                      return <td key={court.id} className="px-1.5 py-1" />;
                    }
                    const state = cellState(slot, {
                      courtId: court.id,
                      selectedSlot,
                      durationMinutes,
                      unitMinutes,
                    });
                    const clickable = state === "free" || state === "start";
                    const label =
                      state === "start" ? `${formatTime(time)} start` : STATE_TEXT[state];
                    return (
                      <td key={court.id} className="px-1.5 py-1">
                        <button
                          type="button"
                          disabled={!clickable && state !== "partial"}
                          aria-disabled={state === "partial" ? "true" : undefined}
                          aria-label={`${court.name}, ${formatTime(time)}, ${STATE_ARIA[state]}`}
                          onClick={() => {
                            if (state === "start") {
                              onDeselectSlot();
                              return;
                            }
                            if (state !== "free") return;
                            onSelectSlot({
                              courtId: court.id,
                              startTime: slot.startTime,
                              maxUnits: slot.maxUnits,
                            });
                          }}
                          className={`w-full rounded-lg px-2 py-2.5 text-center text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-default ${STATE_CLASSES[state]}`}
                        >
                          {label}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!hasFreeSlot && (
        <p className="mt-4 text-sm text-text-muted">No free slots left in this band.</p>
      )}

      <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-4 text-sm text-text-muted">
        {LEGEND.map(({ label, swatchClass }) => (
          <li key={label} className="flex items-center gap-2">
            <span aria-hidden="true" className={`size-3 flex-none rounded-[4px] ${swatchClass}`} />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
