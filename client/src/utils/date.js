// "en-CA" formats a date as YYYY-MM-DD, exactly the format the availability
// and date input controls use, so no extra parsing is needed afterwards.
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

// dateString is "YYYY-MM-DD". Date.UTC normalises an out of range day on its
// own, so adding or subtracting a day never needs to know how long the
// month is.
export function addDays(dateString, days) {
  const [year, month, day] = dateString.split("-").map(Number);
  return dateKeyFormatter.format(new Date(Date.UTC(year, month - 1, day + days)));
}

export function formatDateHeading(dateString) {
  return headingFormatter.format(new Date(dateString));
}
