import { UNIT_LENGTH_MINUTES } from "../config.js";

const UNIT_LENGTH_MS = UNIT_LENGTH_MINUTES * 60 * 1000;

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
