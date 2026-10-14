import { UNIT_LENGTH_MINUTES } from "../config.js";

const UNIT_LENGTH_MS = UNIT_LENGTH_MINUTES * 60 * 1000;

// The court_slots row for every 30 minute unit a booking occupies, from its
// start up to (not including) its end. Needs the booking's own id, so this
// only runs once the booking row already exists, inside the same
// transaction that creates or moves it.
export function courtSlotRowsFor(booking) {
  const rows = [];
  for (
    let start = booking.startTime.getTime();
    start < booking.endTime.getTime();
    start += UNIT_LENGTH_MS
  ) {
    rows.push({ courtId: booking.courtId, slotStart: new Date(start), bookingId: booking.id });
  }
  return rows;
}
