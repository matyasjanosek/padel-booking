import { prisma } from "../db/client.js";
import {
  UNIT_LENGTH_MINUTES,
  OPENING_HOUR_WEEKDAY,
  OPENING_HOUR_WEEKEND,
  CLOSING_HOUR_WEEKDAY,
  CLOSING_HOUR_WEEKEND,
} from "../config.js";
import { pragueTimeToUtc, pragueDateString, formatPragueIso } from "../timezone.js";
import { expireStaleHolds } from "./holdExpiry.js";

const UNIT_LENGTH_MS = UNIT_LENGTH_MINUTES * 60 * 1000;

function isWeekend(date) {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday === 0 || weekday === 6;
}

function openingHourForDate(date) {
  return isWeekend(date) ? OPENING_HOUR_WEEKEND : OPENING_HOUR_WEEKDAY;
}

function closingHourForDate(date) {
  return isWeekend(date) ? CLOSING_HOUR_WEEKEND : CLOSING_HOUR_WEEKDAY;
}

export function closingInstantFor(instant) {
  const date = pragueDateString(instant);
  const [year, month, day] = date.split("-").map(Number);
  return pragueTimeToUtc(year, month, day, closingHourForDate(date), 0);
}

export function slotStartsForDay(date) {
  const [year, month, day] = date.split("-").map(Number);
  const dayStart = pragueTimeToUtc(year, month, day, openingHourForDate(date), 0).getTime();
  const dayEnd = pragueTimeToUtc(year, month, day, closingHourForDate(date), 0).getTime();

  const starts = [];
  for (let start = dayStart; start + UNIT_LENGTH_MS <= dayEnd; start += UNIT_LENGTH_MS) {
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
  const dayStart = new Date(unitStarts[0]);
  const dayEnd = new Date(unitStarts[unitStarts.length - 1] + UNIT_LENGTH_MS);

  const occupied = await prisma.courtSlot.findMany({
    where: { courtId, slotStart: { gte: dayStart, lt: dayEnd } },
    select: { slotStart: true },
  });
  const takenStarts = new Set(occupied.map((row) => row.slotStart.getTime()));

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
