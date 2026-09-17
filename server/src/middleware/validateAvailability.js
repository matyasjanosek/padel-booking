const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export function validateAvailabilityQuery(req, res, next) {
  const { date, courtId } = req.query;

  if (!isValidDate(date)) {
    return res.status(400).json({ error: "Enter a date as YYYY-MM-DD" });
  }

  const courtIdNumber = Number(courtId);
  if (!Number.isInteger(courtIdNumber) || courtIdNumber <= 0) {
    return res.status(400).json({ error: "Enter a valid court id" });
  }

  req.query.courtId = courtIdNumber;
  next();
}
