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

export async function createBooking({ userId, courtId, startTime, durationMinutes, couponCode }) {
  const court = await prisma.court.findUnique({ where: { id: courtId } });
  if (!court || !court.isActive) {
    throw Object.assign(new Error("Court not found"), { code: "P2003" });
  }

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
  const hasGateCode = booking.status === "confirmed";
  const { validFrom, validUntil } = hasGateCode
    ? gateCodeWindow(booking.startTime, booking.endTime)
    : { validFrom: null, validUntil: null };

  return {
    id: booking.id,
    courtId: booking.courtId,
    startTime: formatPragueIso(booking.startTime),
    endTime: formatPragueIso(booking.endTime),
    status: booking.status,
    price: Number(booking.price),
    couponCode: booking.coupon?.code ?? null,
    gateCode: hasGateCode ? booking.gateCode : null,
    gateCodeValidFrom: validFrom ? formatPragueIso(validFrom) : null,
    gateCodeValidUntil: validUntil ? formatPragueIso(validUntil) : null,
    holdExpiresAt: booking.holdExpiresAt ? formatPragueIso(booking.holdExpiresAt) : null,
  };
}
