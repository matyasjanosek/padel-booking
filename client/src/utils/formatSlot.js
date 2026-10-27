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

// The local Prague hour, 0-23, used to band a slot into night/morning/
// afternoon/evening.
export function pragueHour(time) {
  return Number(timeFormatter.format(new Date(time)).split(":")[0]);
}

// Compact form for a length chip: "1h", "1h 30".
export function formatDurationChip(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}`;
}

// Full words for the summary panel: "1 hour", "1 hour 30 min".
export function formatDurationWords(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hourPart = `${hours} hour${hours === 1 ? "" : "s"}`;
  return rest === 0 ? hourPart : `${hourPart} ${rest} min`;
}
