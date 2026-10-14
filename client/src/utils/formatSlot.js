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

// 60 as "1h", 90 as "1h30", 120 as "2h", and so on. Durations are always a
// whole number of 30 minute units, so there is never a leftover minute to
// show beyond ":30".
export function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h${rest}`;
}
