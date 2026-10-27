import { prisma } from "../db/client.js";
import { UNIT_LENGTH_MINUTES } from "../config.js";
import { formatPragueIso } from "../timezone.js";
import { slotStartsForDay } from "./availability.js";
import { releasePaymentIfPending } from "./payments.js";
import { courtSlotRowsFor } from "./courtSlots.js";
import { scheduleLighting, cancelLighting } from "../hardware/index.js";

const UNIT_LENGTH_MS = UNIT_LENGTH_MINUTES * 60 * 1000;

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
      lt: new Date(slotStarts[slotStarts.length - 1] + UNIT_LENGTH_MS),
    };
  }

  return prisma.booking.findMany({
    where,
    include: { user: true, court: true },
    orderBy: { startTime: "desc" },
  });
}

export async function rescheduleBooking(bookingId, { courtId, startTime }) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    return { outcome: "not_found" };
  }
  if (booking.status !== "pending" && booking.status !== "confirmed") {
    return { outcome: "not_reschedulable" };
  }

  const durationMs = booking.endTime.getTime() - booking.startTime.getTime();
  const endTime = new Date(startTime.getTime() + durationMs);

  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      const result = await tx.booking.update({
        where: { id: bookingId },
        data: { courtId, startTime, endTime },
        include: { user: true, court: true },
      });
      await tx.courtSlot.deleteMany({ where: { bookingId } });
      await tx.courtSlot.createMany({ data: courtSlotRowsFor(result) });
      return result;
    });
  } catch (error) {
    if (error.code === "P2002" || error.code === "P2034") {
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

export async function cancelBookingAsAdmin(bookingId) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    return { outcome: "not_found" };
  }
  if (booking.status !== "pending" && booking.status !== "confirmed") {
    return { outcome: "not_cancellable" };
  }

  const cancelled = await prisma.$transaction(async (tx) => {
    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: { status: "cancelled", gateCode: null },
      include: { user: true, court: true },
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
