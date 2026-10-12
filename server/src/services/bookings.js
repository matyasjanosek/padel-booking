import { prisma } from "../db/client.js";
import { SLOT_LENGTH_MINUTES, HOLD_MINUTES, PRICE_PER_SLOT_CZK } from "../config.js";
import { formatPragueIso } from "../timezone.js";
import { releasePaymentIfPending } from "./payments.js";
import { validateCoupon, applyDiscount, COUPON_ERROR_MESSAGES } from "./coupons.js";

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
export async function createBooking({ userId, courtId, startTime, couponCode }) {
  // An inactive court is not bookable, the same as if it did not exist.
  // There is no foreign key for "and the court must be active", so this
  // needs its own check; thrown with a P2003 code so the existing "court
  // not found" handling in the route already covers it, nothing else about
  // that response needs to say whether the court is missing or just closed.
  const court = await prisma.court.findUnique({ where: { id: courtId } });
  if (!court || !court.isActive) {
    throw Object.assign(new Error("Court not found"), { code: "P2003" });
  }

  // Applying the code only checks it is currently usable, it does not count
  // as a use yet, see handlePaymentSucceeded in stripeWebhook.js for that.
  // A bad code is rejected here, before any booking row exists.
  let price = PRICE_PER_SLOT_CZK;
  let couponId = null;
  if (couponCode) {
    const result = await validateCoupon(couponCode);
    if (result.outcome !== "valid") {
      throw Object.assign(new Error(COUPON_ERROR_MESSAGES[result.outcome]), {
        code: "COUPON_ERROR",
      });
    }
    price = applyDiscount(price, result.coupon);
    couponId = result.coupon.id;
  }

  const endTime = new Date(startTime.getTime() + SLOT_LENGTH_MS);
  const data = {
    userId,
    courtId,
    couponId,
    startTime,
    endTime,
    status: "pending",
    price,
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
    include: { coupon: true },
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
// as this runs. If a payment for it is still pending, nobody completed or
// failed the checkout before cancelling, that payment is released too, see
// releasePaymentIfPending. Cancelling an already paid booking does not
// touch its payment, undoing that needs an actual refund, out of scope here.
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
  await releasePaymentIfPending(bookingId);
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
    // Only present when the booking's coupon was included in the query it
    // came from (listBookingsForUser does this, so Checkout can show it).
    couponCode: booking.coupon?.code ?? null,
    holdExpiresAt: booking.holdExpiresAt ? formatPragueIso(booking.holdExpiresAt) : null,
  };
}
