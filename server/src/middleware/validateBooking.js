import { UNIT_LENGTH_MINUTES, MIN_BOOKING_MINUTES, MAX_BOOKING_MINUTES } from "../config.js";
import { slotStartsForDay } from "../services/availability.js";
import { pragueDateString } from "../timezone.js";

function isValidDuration(minutes) {
  return (
    Number.isInteger(minutes) &&
    minutes >= MIN_BOOKING_MINUTES &&
    minutes <= MAX_BOOKING_MINUTES &&
    minutes % UNIT_LENGTH_MINUTES === 0
  );
}

export function validateCreateBooking(req, res, next) {
  const { courtId, startTime, durationMinutes, couponCode } = req.body;

  const courtIdNumber = Number(courtId);
  if (!Number.isInteger(courtIdNumber) || courtIdNumber <= 0) {
    return res.status(400).json({ error: "Enter a valid court id" });
  }

  const startDate = new Date(startTime);
  if (typeof startTime !== "string" || Number.isNaN(startDate.getTime())) {
    return res.status(400).json({ error: "Enter a valid start time" });
  }

  if (startDate.getTime() <= Date.now()) {
    return res.status(400).json({ error: "Pick a time in the future" });
  }

  const validStarts = slotStartsForDay(pragueDateString(startDate));
  if (!validStarts.includes(startDate.getTime())) {
    return res.status(400).json({ error: "Pick a valid time slot" });
  }

  const durationNumber = Number(durationMinutes);
  if (!isValidDuration(durationNumber)) {
    return res.status(400).json({ error: "Pick a valid booking length" });
  }

  // Optional, left out entirely when no code was entered.
  if (couponCode !== undefined && couponCode !== null && typeof couponCode !== "string") {
    return res.status(400).json({ error: "Enter a valid coupon code" });
  }

  req.body.courtId = courtIdNumber;
  req.body.startTime = startDate;
  req.body.durationMinutes = durationNumber;
  req.body.couponCode = couponCode ? couponCode.trim() || undefined : undefined;
  next();
}

export function validateRescheduleBooking(req, res, next) {
  const { courtId, startTime } = req.body;

  const courtIdNumber = Number(courtId);
  if (!Number.isInteger(courtIdNumber) || courtIdNumber <= 0) {
    return res.status(400).json({ error: "Enter a valid court id" });
  }

  const startDate = new Date(startTime);
  if (typeof startTime !== "string" || Number.isNaN(startDate.getTime())) {
    return res.status(400).json({ error: "Enter a valid start time" });
  }

  const validStarts = slotStartsForDay(pragueDateString(startDate));
  if (!validStarts.includes(startDate.getTime())) {
    return res.status(400).json({ error: "Pick a valid time slot" });
  }

  req.body.courtId = courtIdNumber;
  req.body.startTime = startDate;
  next();
}
