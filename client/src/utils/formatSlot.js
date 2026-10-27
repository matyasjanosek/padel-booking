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

export function formatSlot(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const startDate = dateFormatter.format(start);
  const endDate = dateFormatter.format(end);

  // A booking can now cross midnight, so only drop the second date when
  // the booking actually stays on one calendar day.
  if (startDate === endDate) {
    return `${startDate}, ${timeFormatter.format(start)} to ${timeFormatter.format(end)}`;
  }
  return `${startDate}, ${timeFormatter.format(start)} to ${endDate}, ${timeFormatter.format(end)}`;
}

export function formatTime(time) {
  return timeFormatter.format(new Date(time));
}

export function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h${rest}`;
}
