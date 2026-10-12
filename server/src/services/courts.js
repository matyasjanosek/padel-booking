import { prisma } from "../db/client.js";

// All courts, including inactive ones. Used by the admin courts page, which
// needs to see an inactive court to be able to reactivate it.
export function listCourts() {
  return prisma.court.findMany({ orderBy: { id: "asc" } });
}

// Only the active ones. Used by the public /api/courts: an inactive court
// should not be offered for a new booking, see getAvailability and
// createBooking for the other half of that rule.
export function listActiveCourts() {
  return prisma.court.findMany({ where: { isActive: true }, orderBy: { id: "asc" } });
}

export async function renameCourt(id, name) {
  const court = await prisma.court.findUnique({ where: { id } });
  if (!court) {
    return { outcome: "not_found" };
  }
  const updated = await prisma.court.update({ where: { id }, data: { name } });
  return { outcome: "renamed", court: updated };
}

// Deactivating only affects whether the court can be offered for a new
// booking going forward, it never touches bookings that already exist. The
// admin still needs to know about any confirmed booking still ahead of it
// though: that booking stays on a court nobody can see or book around any
// more, and may need rescheduling or cancelling by hand.
export async function setCourtActive(id, isActive) {
  const court = await prisma.court.findUnique({ where: { id } });
  if (!court) {
    return { outcome: "not_found" };
  }
  const updated = await prisma.court.update({ where: { id }, data: { isActive } });

  if (isActive) {
    return { outcome: "activated", court: updated };
  }

  const futureConfirmedBookings = await prisma.booking.count({
    where: { courtId: id, status: "confirmed", startTime: { gt: new Date() } },
  });
  return { outcome: "deactivated", court: updated, futureConfirmedBookings };
}
