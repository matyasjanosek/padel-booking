import { prisma } from "../db/client.js";
import { UNIT_LENGTH_MINUTES, MAX_BOOKING_MINUTES } from "../config.js";
import { pragueTimeToUtc, pragueDateString, formatPragueIso } from "../timezone.js";
import { expireStaleHolds } from "./holdExpiry.js";

const UNIT_LENGTH_MS = UNIT_LENGTH_MINUTES * 60 * 1000;
const MAX_UNITS = MAX_BOOKING_MINUTES / UNIT_LENGTH_MINUTES;

// The club is open all day, every day, so a day's units run from its local
// start to the local start of the next day. Stepping between two real
// instants rather than counting fixed units means this is still correct on
// the two Prague days a year that are not 24 hours long: 23 hours when
// clocks spring forward, 25 when they fall back.
export function slotStartsForDay(date) {
  const [year, month, day] = date.split("-").map(Number);
  const dayStart = pragueTimeToUtc(year, month, day, 0, 0).getTime();
  // Date.UTC (which pragueTimeToUtc builds its guess from) normalises an
  // out-of-range day, so day + 1 resolves to the 1st of next month on the
  // last day of a month without any separate date arithmetic.
  const dayEnd = pragueTimeToUtc(year, month, day + 1, 0, 0).getTime();

  const starts = [];
  for (let start = dayStart; start < dayEnd; start += UNIT_LENGTH_MS) {
    starts.push(start);
  }
  return starts;
}

export async function getAvailability(courtId, date) {
  const court = await prisma.court.findUnique({ where: { id: courtId } });
  if (!court || !court.isActive) {
    return null;
  }

  await expireStaleHolds();

  const unitStarts = slotStartsForDay(date);
  const dayEnd = unitStarts[unitStarts.length - 1] + UNIT_LENGTH_MS;
  // A free run starting late in the day can continue into tomorrow's own
  // units now that a booking is allowed to cross midnight, so tomorrow's
  // starts are chained on for the maxUnits count, then dropped: the
  // response is still only today's own slots.
  const nextDayStarts = slotStartsForDay(pragueDateString(new Date(dayEnd)));
  const chainStarts = [...unitStarts, ...nextDayStarts];

  const rangeStart = new Date(chainStarts[0]);
  const rangeEnd = new Date(chainStarts[chainStarts.length - 1] + UNIT_LENGTH_MS);

  const occupied = await prisma.courtSlot.findMany({
    where: { courtId, slotStart: { gte: rangeStart, lt: rangeEnd } },
    select: { slotStart: true },
  });
  const takenStarts = new Set(occupied.map((row) => row.slotStart.getTime()));

  const maxUnitsFrom = new Array(chainStarts.length).fill(0);
  for (let i = chainStarts.length - 1; i >= 0; i--) {
    if (takenStarts.has(chainStarts[i])) {
      continue;
    }
    maxUnitsFrom[i] = 1 + (i + 1 < chainStarts.length ? maxUnitsFrom[i + 1] : 0);
  }

  return unitStarts.map((start, i) => {
    const taken = takenStarts.has(start);
    return {
      startTime: formatPragueIso(new Date(start)),
      endTime: formatPragueIso(new Date(start + UNIT_LENGTH_MS)),
      status: taken ? "taken" : "free",
      ...(taken ? {} : { maxUnits: Math.min(maxUnitsFrom[i], MAX_UNITS) }),
    };
  });
}
