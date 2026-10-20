const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Prague" });

const headingFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Prague",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
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
