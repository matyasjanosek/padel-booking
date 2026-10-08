import { prisma } from "../db/client.js";
import { SLOT_LENGTH_MINUTES, HOLD_MINUTES, PRICE_PER_SLOT_CZK } from "../config.js";
import { formatPragueIso } from "../timezone.js";

const SLOT_LENGTH_MS = SLOT_LENGTH_MINUTES * 60 * 1000;
const HOLD_MS = HOLD_MINUTES * 60 * 1000;

// A slot that was booked before and is now stale, its hold expired or it
// was cancelled, still has a row at that (court_id, start_time). MySQL's
// unique index does not care about status, so inserting there always
// raises P2002 even though the slot is free again. This is the condition
// under which an existing row may be taken over instead of left blocking
// the slot forever. A function, not a constant, so "now" is read fresh on
// every call rather than once when the module loads.
function reclaimableConditions() {
  return [
    { status: "cancelled" },
    { status: "expired" },
    { status: "pending", holdExpiresAt: { lt: new Date() } },
  ];
}

// Creates a pending booking with a hold a few minutes ahead. For a slot
// nobody has booked before, the (court_id, start_time) unique constraint is
// the guarantee against double booking, as the plan intends: this just
// inserts and lets a P2002 from a genuine race propagate, the route turns
// it into a 409.
//
// For a slot that already has a stale row, the insert's P2002 is instead
// handled here: the existing row is reclaimed in place with an update
// guarded by RECLAIMABLE, so it only matches if the row is still actually
// stale at the moment the update runs. Its affected row count is the race
// guarantee for this path, the same role the unique constraint plays for a
// brand new slot. If it affects no rows, the slot is genuinely taken, or
// someone else's request reclaimed it a moment earlier, and the original
// P2002 propagates instead.
export async function createBooking({ userId, courtId, startTime }) {
  const endTime = new Date(startTime.getTime() + SLOT_LENGTH_MS);
  const data = {
    userId,
    courtId,
    startTime,
    endTime,
    status: "pending",
    price: PRICE_PER_SLOT_CZK,
    holdExpiresAt: new Date(Date.now() + HOLD_MS),
  };

  try {
    return await prisma.booking.create({ data });
  } catch (error) {
    if (error.code !== "P2002") {
      throw error;
    }

    const reclaimed = await prisma.booking.updateMany({
      where: { courtId, startTime, OR: reclaimableConditions() },
      data,
    });
    if (reclaimed.count === 0) {
      throw error;
    }
    return prisma.booking.findUniqueOrThrow({
      where: { courtId_startTime: { courtId, startTime } },
    });
  }
}

export function listBookingsForUser(userId) {
  return prisma.booking.findMany({
    where: { userId },
    orderBy: { startTime: "desc" },
  });
}

// Only the booking's own owner can cancel it, and only while it is still
// pending or confirmed, a booking that already expired or was cancelled
// cannot be cancelled again. Returns which of those applied, so the route
// can turn it into the right status code, there is no single good sentinel
// value to tell apart "not found", "not yours" and "already settled".
//
// A cancelled booking is one of the conditions createBooking's reclaim
// logic already treats as stale, so the slot becomes bookable again as soon
// as this runs, no extra wiring needed.
export async function cancelBooking(bookingId, userId) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

  if (!booking) {
    return { outcome: "not_found" };
  }
  if (booking.userId !== userId) {
    return { outcome: "forbidden" };
  }
  if (booking.status !== "pending" && booking.status !== "confirmed") {
    return { outcome: "not_cancellable" };
  }

  const cancelled = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "cancelled" },
  });
  return { outcome: "cancelled", booking: cancelled };
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
