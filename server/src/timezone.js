export const PRAGUE_TIME_ZONE = "Europe/Prague";

const FIELD_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: PRAGUE_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

// The calendar date and time of day in Prague for a UTC instant, as numbers.
function pragueFields(instant) {
  return FIELD_FORMATTER.formatToParts(instant).reduce((fields, part) => {
    if (part.type !== "literal") fields[part.type] = Number(part.value);
    return fields;
  }, {});
}

function pragueOffsetMs(instant) {
  const fields = pragueFields(instant);
  const asUtc = Date.UTC(
    fields.year,
    fields.month - 1,
    fields.day,
    fields.hour,
    fields.minute,
    fields.second,
    instant.getUTCMilliseconds(),
  );
  return asUtc - instant.getTime();
}

export function pragueTimeToUtc(year, month, day, hour, minute) {
  const naiveGuess = Date.UTC(year, month - 1, day, hour, minute);
  const firstOffset = pragueOffsetMs(new Date(naiveGuess));
  const secondOffset = pragueOffsetMs(new Date(naiveGuess - firstOffset));
  return new Date(naiveGuess - secondOffset);
}

export function pragueDateString(instant) {
  const { year, month, day } = pragueFields(instant);
  const pad = (value) => String(value).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function formatPragueIso(instant) {
  const offsetMs = pragueOffsetMs(instant);
  const local = new Date(instant.getTime() + offsetMs);
  const pad = (value) => String(value).padStart(2, "0");

  const sign = offsetMs >= 0 ? "+" : "-";
  const offsetMinutesTotal = Math.abs(offsetMs) / 60000;
  const offsetHours = pad(Math.floor(offsetMinutesTotal / 60));
  const offsetMinutes = pad(offsetMinutesTotal % 60);

  return (
    `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}` +
    `T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}` +
    `.${String(local.getUTCMilliseconds()).padStart(3, "0")}` +
    `${sign}${offsetHours}:${offsetMinutes}`
  );
}
