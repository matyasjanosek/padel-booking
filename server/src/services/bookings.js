import { prisma } from "../db/client.js";
import { HOLD_MINUTES, PRICE_PER_HOUR_CZK } from "../config.js";
import { formatPragueIso } from "../timezone.js";
import { releasePaymentIfPending } from "./payments.js";
import { validateCoupon, applyDiscount, COUPON_ERROR_MESSAGES } from "./coupons.js";
import { gateCodeWindow } from "./gateCode.js";
import { courtSlotRowsFor } from "./courtSlots.js";
import { cancelLighting } from "../hardware/index.js";

const HOLD_MS = HOLD_MINUTES * 60 * 1000;

// UNIT_LENGTH_MINUTES is always half an hour, so durationMinutes / 60 is
// always a multiple of 0.5, and this is always exact: no rounding needed the
// way applyDiscount needs it for a percentage coupon.
function priceForDuration(durationMinutes) {
  return (durationMinutes / 60) * PRICE_PER_HOUR_CZK;
}

// Creates a pending booking with a hold a few minutes ahead, for a chosen
// start and duration. The court_slots table is the only thing enforcing no
// overlap: the booking row and one court_slots row per 30 minute unit it
// covers are inserted together in one transaction, so a conflict with any
// existing booking, whatever its own start time, fails the insert and rolls
// both back. There is nothing to reclaim here any more: a cancelled or
// expired booking's own units are deleted as it happens (see cancelBooking,
// cancelBookingAsAdmin and expireStaleHolds), so a freed slot is simply
// free, not a stale row waiting to be taken over.
export async function createBooking({ userId, courtId, startTime, durationMinutes, couponCode }) {
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
  let price = priceForDuration(durationMinutes);
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

  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
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

  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.create({ data });
    await tx.courtSlot.createMany({ data: courtSlotRowsFor(booking) });
    return booking;
  });
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
// Its court_slots rows are deleted in the same transaction as the status
// change, so the slot is free again, for anyone, the instant this commits:
// there is no freed-but-not-yet-freed moment another request could land in.
// If a payment for it is still pending, nobody completed or failed the
// checkout before cancelling, that payment is released too, see
// releasePaymentIfPending; this runs after the transaction, a call to
// Stripe cannot be part of a database transaction. Cancelling an already
// paid booking does not touch its payment, undoing that needs an actual
// refund, out of scope here.
//
// gateCode is cleared, not just left behind: a cancelled booking must not
// carry a code that still looks live sitting in the row, even though
// gateAccess.js's own status check already refuses it either way. The same
// reasoning applies to lighting: a confirmed booking already has it
// scheduled (see stripeWebhook.js), and cancelling must cancel that too, or
// the lights would still come on for a booking that no longer exists.
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

  const cancelled = await prisma.$transaction(async (tx) => {
    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: { status: "cancelled", gateCode: null },
    });
    await tx.courtSlot.deleteMany({ where: { bookingId } });
    return updated;
  });
  await releasePaymentIfPending(bookingId);
  if (booking.status === "confirmed") {
    cancelLighting({ courtId: booking.courtId, startTime: booking.startTime });
  }
  return { outcome: "cancelled", booking: cancelled };
}

export function toPublicBooking(booking) {
  // Only a confirmed booking has a working code. cancelBooking never clears
  // gateCode off a booking that was confirmed before it was cancelled, so
  // this checks status itself rather than just booking.gateCode, or a
  // cancelled booking would still show one.
  const hasGateCode = booking.status === "confirmed";
  const { validFrom, validUntil } = hasGateCode
    ? gateCodeWindow(booking.startTime)
    : { validFrom: null, validUntil: null };

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
    gateCode: hasGateCode ? booking.gateCode : null,
    gateCodeValidFrom: validFrom ? formatPragueIso(validFrom) : null,
    gateCodeValidUntil: validUntil ? formatPragueIso(validUntil) : null,
    holdExpiresAt: booking.holdExpiresAt ? formatPragueIso(booking.holdExpiresAt) : null,
  };
}
