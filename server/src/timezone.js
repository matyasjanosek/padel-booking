// Converts between UTC instants and Europe/Prague wall clock time, including
// the summer time change. Node's Intl already has the IANA timezone rules
// built in, so no timezone library is needed for this.
export const PRAGUE_TIME_ZONE = "Europe/Prague";

// The Europe/Prague UTC offset, in milliseconds, at a given instant.
// Formatting the instant in Prague and reinterpreting those same fields as
// UTC gives a value that differs from the instant by exactly the offset,
// and Intl already applies the correct rule for whichever date this is.
function pragueOffsetMs(instant) {
  const fields = new Intl.DateTimeFormat("en-US", {
    timeZone: PRAGUE_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(instant)
    .reduce((acc, part) => {
      if (part.type !== "literal") acc[part.type] = Number(part.value);
      return acc;
    }, {});

  const asUtc = Date.UTC(
    fields.year,
    fields.month - 1,
    fields.day,
    fields.hour,
    fields.minute,
    fields.second,
  );
  return asUtc - instant.getTime();
}

// The UTC instant for a Europe/Prague wall clock time. Looks up the offset
// twice: the first pass gets close, the second confirms it, so the result
// is correct even for a time that falls right on the moment clocks change.
export function pragueTimeToUtc(year, month, day, hour, minute) {
  const naiveGuess = Date.UTC(year, month - 1, day, hour, minute);
  const firstOffset = pragueOffsetMs(new Date(naiveGuess));
  const secondOffset = pragueOffsetMs(new Date(naiveGuess - firstOffset));
  return new Date(naiveGuess - secondOffset);
}

// Formats a UTC instant as an ISO 8601 string in Europe/Prague, with that
// moment's real offset (+01:00 in winter, +02:00 in summer) instead of Z, so
// it reads as local time while still being an exact, unambiguous instant.
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
