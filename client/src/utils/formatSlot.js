const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Prague",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Prague",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// The server already sends each time with its correct Prague offset, but
// formatting still falls back to the viewer's own timezone unless told
// otherwise, and a court's booked time means Prague time, not wherever the
// viewer happens to be.
export function formatSlot(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return `${dateFormatter.format(start)}, ${timeFormatter.format(start)} to ${timeFormatter.format(end)}`;
}

export function formatTime(time) {
  return timeFormatter.format(new Date(time));
}
