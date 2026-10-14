import { prisma } from "../db/client.js";
import {
  UNIT_LENGTH_MINUTES,
  OPENING_HOUR,
  CLOSING_HOUR_WEEKDAY,
  CLOSING_HOUR_WEEKEND,
} from "../config.js";
import { pragueTimeToUtc, pragueDateString, formatPragueIso } from "../timezone.js";
import { expireStaleHolds } from "./holdExpiry.js";

const UNIT_LENGTH_MS = UNIT_LENGTH_MINUTES * 60 * 1000;

// The closing hour for a calendar date, later on a weekday than at the
// weekend. date is "YYYY-MM-DD"; its day of the week is a property of the
// calendar date itself, not of any timezone, so this needs no Prague
// conversion the way the actual opening and closing instants below do.
function closingHourForDate(date) {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const isWeekend = weekday === 0 || weekday === 6;
  return isWeekend ? CLOSING_HOUR_WEEKEND : CLOSING_HOUR_WEEKDAY;
}

// The closing instant, as a UTC Date, for whichever Prague calendar date a
// given instant falls on. Used to check a booking does not run past
// closing, for a new booking's chosen start and duration, and for a
// reschedule keeping its own existing duration.
export function closingInstantFor(instant) {
  const date = pragueDateString(instant);
  const [year, month, day] = date.split("-").map(Number);
  return pragueTimeToUtc(year, month, day, closingHourForDate(date), 0);
}

// The start time of every 30 minute unit in the bookable window for one day,
// as UTC timestamps. date is "YYYY-MM-DD"; the opening and closing hour are
// Europe/Prague wall clock time, so this shifts with the summer time change.
// Exported so booking creation can check a requested start is a real unit
// boundary.
export function slotStartsForDay(date) {
  const [year, month, day] = date.split("-").map(Number);
  const dayStart = pragueTimeToUtc(year, month, day, OPENING_HOUR, 0).getTime();
  const dayEnd = pragueTimeToUtc(year, month, day, closingHourForDate(date), 0).getTime();

  const starts = [];
  for (let start = dayStart; start + UNIT_LENGTH_MS <= dayEnd; start += UNIT_LENGTH_MS) {
    starts.push(start);
  }
  return starts;
}

// Returns null when the court does not exist or is not active, an inactive
// court is not offered for a new booking, the same way as if it did not
// exist. Otherwise the full list of units for that day, each marked free or
// taken. A free unit also carries maxUnits: how many consecutive free units,
// itself included, follow it before the next taken unit or closing time,
// which is the longest booking that can start there. The client offers
// durations from this and applies no closing or overlap rule of its own;
// createBooking checks both again when the booking is actually made. Times
// are stored and compared in UTC but shown in Europe/Prague, see
// src/timezone.js.
export async function getAvailability(courtId, date) {
  const court = await prisma.court.findUnique({ where: { id: courtId } });
  if (!court || !court.isActive) {
    return null;
  }

  // The query below already treats a unit whose booking's hold has passed
  // as free, with or without this. Sweeping here keeps the stored rows
  // accurate for whoever reads this next, without waiting for the scheduled
  // job's next run, see expireStaleHolds for how a stale hold's own units
  // are freed.
  await expireStaleHolds();

  const unitStarts = slotStartsForDay(date);
  const dayStart = new Date(unitStarts[0]);
  const dayEnd = new Date(unitStarts[unitStarts.length - 1] + UNIT_LENGTH_MS);

  const occupied = await prisma.courtSlot.findMany({
    where: { courtId, slotStart: { gte: dayStart, lt: dayEnd } },
    select: { slotStart: true },
  });
  const takenStarts = new Set(occupied.map((row) => row.slotStart.getTime()));

  // Walked from the end of the day backwards, so each unit's run length only
  // needs the one already computed for the unit right after it, rather than
  // rescanning the rest of the day for every unit.
  const maxUnitsFrom = new Array(unitStarts.length).fill(0);
  for (let i = unitStarts.length - 1; i >= 0; i--) {
    if (takenStarts.has(unitStarts[i])) {
      continue;
    }
    maxUnitsFrom[i] = 1 + (i + 1 < unitStarts.length ? maxUnitsFrom[i + 1] : 0);
  }

  return unitStarts.map((start, i) => {
    const taken = takenStarts.has(start);
    return {
      startTime: formatPragueIso(new Date(start)),
      endTime: formatPragueIso(new Date(start + UNIT_LENGTH_MS)),
      status: taken ? "taken" : "free",
      ...(taken ? {} : { maxUnits: maxUnitsFrom[i] }),
    };
  });
}
