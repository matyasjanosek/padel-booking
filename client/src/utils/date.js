const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Prague" });

const headingFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Prague",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const chipDateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Prague",
  day: "numeric",
  month: "short",
});

const weekdayFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Prague",
  weekday: "short",
});

export function todayInPrague() {
  return dateKeyFormatter.format(new Date());
}

export function addDays(dateString, days) {
  const [year, month, day] = dateString.split("-").map(Number);
  return dateKeyFormatter.format(new Date(Date.UTC(year, month - 1, day + days)));
}

export function formatDateHeading(dateString) {
  return headingFormatter.format(new Date(dateString));
}

// Compact "27 Oct" for a day chip's second line.
export function formatChipDate(dateString) {
  return chipDateFormatter.format(new Date(dateString));
}

// Short weekday, "Thu", for a day chip beyond Today/Tomorrow.
export function formatWeekday(dateString) {
  return weekdayFormatter.format(new Date(dateString));
}
