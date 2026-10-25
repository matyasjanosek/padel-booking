import { useEffect, useState } from "react";
import { fetchCourts } from "../api/courts.js";
import { fetchAvailability } from "../api/availability.js";
import { formatTime } from "../utils/formatSlot.js";
import { todayInPrague, addDays } from "../utils/date.js";
import HeroCard from "./HeroCard.jsx";

// How far forward to look for a free slot before giving up and hiding the
// card; two courts realistically never go longer than this without one.
const MAX_DAYS_AHEAD = 14;

const weekdayFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Prague",
  weekday: "short",
});

function ClockIcon() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

// The earliest free slot across every court, searching forward a day at a
// time from today until one turns up or the search window runs out.
async function findNextFreeSlot(courts) {
  const today = todayInPrague();

  for (let offset = 0; offset <= MAX_DAYS_AHEAD; offset++) {
    const date = addDays(today, offset);
    const availability = await Promise.all(
      courts.map((court) => fetchAvailability({ courtId: court.id, date })),
    );

    let earliest = null;
    availability.forEach(({ slots }, index) => {
      const free = slots.find((slot) => slot.status === "free");
      if (free && (!earliest || free.startTime < earliest.startTime)) {
        earliest = { ...free, courtName: courts[index].name };
      }
    });
    if (earliest) {
      return { ...earliest, isToday: date === today };
    }
  }

  return null;
}

// No placeholder while this loads and no fallback text if it fails or
// nothing is free; the card simply does not render.
export default function NextFreeSlotCard() {
  const [slot, setSlot] = useState(null);

  useEffect(() => {
    fetchCourts()
      .then(findNextFreeSlot)
      .then(setSlot)
      .catch(() => {});
  }, []);

  if (!slot) {
    return null;
  }

  const day = slot.isToday ? "Today" : weekdayFormatter.format(new Date(slot.startTime));

  return (
    <HeroCard
      icon={
        <span className="flex size-8 flex-none items-center justify-center rounded-[10px] bg-hero-accent text-bg">
          <ClockIcon />
        </span>
      }
      label="Next free slot"
      value={`${day} ${formatTime(slot.startTime)} · ${slot.courtName}`}
      className="-left-[10%] top-[2%]"
    />
  );
}
