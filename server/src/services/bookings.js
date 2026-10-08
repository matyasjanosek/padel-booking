import { prisma } from "../db/client.js";
import { SLOT_LENGTH_MINUTES, HOLD_MINUTES, PRICE_PER_SLOT_CZK } from "../config.js";
import { formatPragueIso } from "../timezone.js";

const SLOT_LENGTH_MS = SLOT_LENGTH_MINUTES * 60 * 1000;
const HOLD_MS = HOLD_MINUTES * 60 * 1000;

// Creates a pending booking with a hold a few minutes ahead. Relies on the
// (court_id, start_time) unique constraint for the double booking guarantee
// and the court_id foreign key for a court that does not exist; the caller
// is expected to let a P2002 or P2003 error from this propagate.
export function createBooking({ userId, courtId, startTime }) {
  const endTime = new Date(startTime.getTime() + SLOT_LENGTH_MS);
  const holdExpiresAt = new Date(Date.now() + HOLD_MS);

  return prisma.booking.create({
    data: {
      userId,
      courtId,
      startTime,
      endTime,
      status: "pending",
      price: PRICE_PER_SLOT_CZK,
      holdExpiresAt,
    },
  });
}

export function toPublicBooking(booking) {
  return {
    id: booking.id,
    courtId: booking.courtId,
    startTime: formatPragueIso(booking.startTime),
    endTime: formatPragueIso(booking.endTime),
    status: booking.status,
    // price is a Prisma Decimal, which serialises to a string in JSON.
    price: Number(booking.price),
    holdExpiresAt: booking.holdExpiresAt ? formatPragueIso(booking.holdExpiresAt) : null,
  };
}
