import { prisma } from "../db/client.js";
import { SLOT_LENGTH_MINUTES, OPENING_HOUR, CLOSING_HOUR } from "../config.js";
import { pragueTimeToUtc, formatPragueIso } from "../timezone.js";

const SLOT_LENGTH_MS = SLOT_LENGTH_MINUTES * 60 * 1000;

// The start time of every slot in the bookable window for one day, as UTC
// timestamps. date is "YYYY-MM-DD"; the opening and closing hour are
// Europe/Prague wall clock time, so this shifts with the summer time change.
// Exported so booking creation can check a requested time is a real slot.
export function slotStartsForDay(date) {
  const [year, month, day] = date.split("-").map(Number);
  const dayStart = pragueTimeToUtc(year, month, day, OPENING_HOUR, 0).getTime();
  const dayEnd = pragueTimeToUtc(year, month, day, CLOSING_HOUR, 0).getTime();

  const starts = [];
  for (let start = dayStart; start + SLOT_LENGTH_MS <= dayEnd; start += SLOT_LENGTH_MS) {
    starts.push(start);
  }
  return starts;
}

// Returns null when the court does not exist. Otherwise the full list of
// slots for that day, each marked free or taken. Times are stored and
// compared in UTC but shown in Europe/Prague, see src/timezone.js.
export async function getAvailability(courtId, date) {
  const court = await prisma.court.findUnique({ where: { id: courtId } });
  if (!court) {
    return null;
  }

  const slotStarts = slotStartsForDay(date);
  const dayStart = new Date(slotStarts[0]);
  const dayEnd = new Date(slotStarts[slotStarts.length - 1] + SLOT_LENGTH_MS);
  const now = new Date();

  const blockingBookings = await prisma.booking.findMany({
    where: {
      courtId,
      startTime: { gte: dayStart, lt: dayEnd },
      OR: [{ status: "confirmed" }, { status: "pending", holdExpiresAt: { gt: now } }],
    },
    select: { startTime: true },
  });
  const takenStarts = new Set(blockingBookings.map((booking) => booking.startTime.getTime()));

  return slotStarts.map((start) => ({
    startTime: formatPragueIso(new Date(start)),
    endTime: formatPragueIso(new Date(start + SLOT_LENGTH_MS)),
    status: takenStarts.has(start) ? "taken" : "free",
  }));
}
