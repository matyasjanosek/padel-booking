import { slotStartsForDay } from "../services/availability.js";
import { pragueDateString } from "../timezone.js";

export function validateCreateBooking(req, res, next) {
  const { courtId, startTime } = req.body;

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

  req.body.courtId = courtIdNumber;
  req.body.startTime = startDate;
  next();
}
