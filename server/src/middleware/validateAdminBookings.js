import { isValidDate } from "./validateAvailability.js";

const STATUSES = ["pending", "confirmed", "cancelled", "expired"];

export function validateAdminBookingsQuery(req, res, next) {
  const { status, courtId, date } = req.query;

  if (status !== undefined && !STATUSES.includes(status)) {
    return res.status(400).json({ error: "Enter a valid status" });
  }

  if (courtId !== undefined) {
    const courtIdNumber = Number(courtId);
    if (!Number.isInteger(courtIdNumber) || courtIdNumber <= 0) {
      return res.status(400).json({ error: "Enter a valid court id" });
    }
    req.query.courtId = courtIdNumber;
  }

  if (date !== undefined && !isValidDate(date)) {
    return res.status(400).json({ error: "Enter a date as YYYY-MM-DD" });
  }

  next();
}
