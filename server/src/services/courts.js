import { prisma } from "../db/client.js";

export function listCourts() {
  return prisma.court.findMany({ orderBy: { id: "asc" } });
}

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
