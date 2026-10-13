import { prisma } from "../db/client.js";
import { SLOT_LENGTH_MINUTES } from "../config.js";
import { formatPragueIso } from "../timezone.js";
import { slotStartsForDay } from "./availability.js";
import { releasePaymentIfPending } from "./payments.js";
import { scheduleLighting, cancelLighting } from "../hardware/index.js";

const SLOT_LENGTH_MS = SLOT_LENGTH_MINUTES * 60 * 1000;

export function listBookingsForAdmin({ status, courtId, date }) {
  const where = {};
  if (status) {
    where.status = status;
  }
  if (courtId) {
    where.courtId = courtId;
  }
  if (date) {
    const slotStarts = slotStartsForDay(date);
    where.startTime = {
      gte: new Date(slotStarts[0]),
      lt: new Date(slotStarts[slotStarts.length - 1] + SLOT_LENGTH_MS),
    };
  }

  return prisma.booking.findMany({
    where,
    include: { user: true, court: true },
    orderBy: { startTime: "desc" },
  });
}

// Only a reschedule, the court and the start time, not a change of status.
// Pending or confirmed bookings can be moved; a cancelled or expired one
// cannot, there is nothing left to reschedule. The same (court_id,
// start_time) uniqueness the member facing flow relies on also guards this,
// a conflicting target slot surfaces the same way, as a P2002.
//
// A confirmed booking already has lighting scheduled for its old slot, see
// stripeWebhook.js. Moving it without updating that would leave the lights
// scheduled for a slot nobody is using any more, and nothing scheduled for
// the slot the player actually has now. A pending booking was never
// confirmed, so nothing was ever scheduled for it, there is nothing to
// touch. The gate code's validity window needs no separate fix: it is
// computed from the booking's own start time every time a code is checked,
// see gateAccess.js, never stored, so it already moves with the booking.
export async function rescheduleBooking(bookingId, { courtId, startTime }) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    return { outcome: "not_found" };
  }
  if (booking.status !== "pending" && booking.status !== "confirmed") {
    return { outcome: "not_reschedulable" };
  }

  const endTime = new Date(startTime.getTime() + SLOT_LENGTH_MS);
  let updated;
  try {
    updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { courtId, startTime, endTime },
      include: { user: true, court: true },
    });
  } catch (error) {
    if (error.code === "P2002") {
      return { outcome: "slot_taken" };
    }
    if (error.code === "P2003") {
      return { outcome: "court_not_found" };
    }
    throw error;
  }

  if (booking.status === "confirmed") {
    cancelLighting({ courtId: booking.courtId, startTime: booking.startTime });
    scheduleLighting({ courtId, startTime, endTime });
  }

  return { outcome: "rescheduled", booking: updated };
}

// Same rule as the member facing cancelBooking: only pending or confirmed
// can be cancelled, a pending payment is released, no ownership check since
// an admin can act on any booking. A confirmed booking's lighting schedule
// is cancelled too, for the same reason a reschedule cancels the old one:
// left in place, the lights would still come on for a booking that no
// longer exists. gateCode is cleared for the same reason, see cancelBooking.
export async function cancelBookingAsAdmin(bookingId) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    return { outcome: "not_found" };
  }
  if (booking.status !== "pending" && booking.status !== "confirmed") {
    return { outcome: "not_cancellable" };
  }

  const cancelled = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "cancelled", gateCode: null },
    include: { user: true, court: true },
  });
  await releasePaymentIfPending(bookingId);
  if (booking.status === "confirmed") {
    cancelLighting({ courtId: booking.courtId, startTime: booking.startTime });
  }

  return { outcome: "cancelled", booking: cancelled };
}

export function toAdminBooking(booking) {
  return {
    id: booking.id,
    user: { id: booking.user.id, name: booking.user.name, email: booking.user.email },
    courtId: booking.courtId,
    courtName: booking.court.name,
    startTime: formatPragueIso(booking.startTime),
    endTime: formatPragueIso(booking.endTime),
    status: booking.status,
    price: Number(booking.price),
    gateCode: booking.gateCode,
  };
}
