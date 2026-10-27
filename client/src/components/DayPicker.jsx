import { useRef, useState } from "react";
import { todayInPrague, addDays, formatChipDate, formatWeekday } from "../utils/date.js";

const WINDOW_SIZE = 4;

export default function DayPicker({ date, onChangeDate }) {
  const [windowStart, setWindowStart] = useState(0);
  const pickDateRef = useRef(null);
  const today = todayInPrague();
  const days = Array.from({ length: WINDOW_SIZE }, (_, index) =>
    addDays(today, windowStart + index),
  );

  function openDatePicker() {
    if (pickDateRef.current?.showPicker) {
      pickDateRef.current.showPicker();
    } else {
      pickDateRef.current?.focus();
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setWindowStart((start) => Math.max(0, start - 1))}
          disabled={windowStart === 0}
          aria-label="Earlier days"
          className="flex size-9 flex-none items-center justify-center rounded-full border border-border text-text transition-colors duration-200 hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-40"
        >
          ‹
        </button>

        {days.map((day, index) => {
          const offset = windowStart + index;
          const selected = day === date;
          const label = offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : formatWeekday(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => onChangeDate(day)}
              aria-pressed={selected}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                selected
                  ? "border-accent bg-accent text-bg"
                  : "border-border text-text hover:border-accent hover:text-accent"
              }`}
            >
              {label}
              <span className={selected ? "text-bg/70" : "text-text-muted"}>
                {formatChipDate(day)}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setWindowStart((start) => start + 1)}
          aria-label="Later days"
          className="flex size-9 flex-none items-center justify-center rounded-full border border-border text-text transition-colors duration-200 hover:border-accent hover:text-accent"
        >
          ›
        </button>

        <span className="relative inline-flex">
          <button
            type="button"
            onClick={openDatePicker}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-text transition-colors duration-200 hover:border-accent hover:text-accent"
          >
            Pick a date
          </button>
          <input
            ref={pickDateRef}
            type="date"
            min={today}
            value={date}
            onChange={(event) => event.target.value && onChangeDate(event.target.value)}
            tabIndex={-1}
            aria-hidden="true"
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </span>
      </div>

      <div className="flex items-center gap-2 text-sm text-text-muted">
        <span
          className="size-2 flex-none animate-pulse rounded-full bg-accent"
          aria-hidden="true"
        />
        Open 24 hours, every day
      </div>
    </div>
  );
}
