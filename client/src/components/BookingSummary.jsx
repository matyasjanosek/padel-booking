import { formatTime, formatDurationChip, formatDurationWords } from "../utils/formatSlot.js";
import { formatChipDate } from "../utils/date.js";

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function BookingSummary({
  selectedSlot,
  selectedEndTime,
  durationMinutes,
  onChangeDuration,
  options,
  courtName,
  date,
  pricePerHour,
  price,
  couponCode,
  onChangeCoupon,
  booking,
  onConfirm,
}) {
  return (
    <div className="rounded-[22px] border border-border bg-surface p-6 md:sticky md:top-24">
      <small className="block text-[13px] uppercase tracking-[0.08em] text-text-muted">
        Your booking
      </small>

      {!selectedSlot ? (
        <p className="mt-6 text-text-muted">Pick a free slot on the grid to start your booking.</p>
      ) : (
        <>
          <p className="numeral mt-3 text-3xl text-text">
            {formatTime(selectedSlot.startTime)}
            {selectedEndTime && `–${formatTime(selectedEndTime)}`}
          </p>
          <p className="mt-1 font-medium text-accent">
            {courtName} · {formatChipDate(date)}
          </p>

          {options.length === 0 ? (
            <p className="mt-4 text-sm text-danger">
              No booking length fits from this start, pick an earlier one.
            </p>
          ) : (
            <>
              <div className="mt-6">
                <small className="block text-[13px] uppercase tracking-[0.08em] text-text-muted">
                  Length
                </small>
                <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Booking length">
                  {options.map((minutes) => {
                    const selected = minutes === durationMinutes;
                    return (
                      <button
                        key={minutes}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onChangeDuration(minutes)}
                        disabled={booking}
                        className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50 ${
                          selected
                            ? "border-accent bg-accent text-bg"
                            : "border-border text-text hover:border-accent hover:text-accent"
                        }`}
                      >
                        {formatDurationChip(minutes)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <dl className="mt-6 divide-y divide-border border-t border-border text-sm">
                <div className="flex items-center justify-between py-3">
                  <dt className="text-text-muted">Rate</dt>
                  <dd className="text-text">{pricePerHour} CZK / hour</dd>
                </div>
                <div className="flex items-center justify-between py-3">
                  <dt className="text-text-muted">Length</dt>
                  <dd className="text-text">{formatDurationWords(durationMinutes)}</dd>
                </div>
              </dl>

              <div className="flex items-baseline justify-between border-t border-border pt-4">
                <small className="text-[13px] uppercase tracking-[0.08em] text-text-muted">
                  Total
                </small>
                <p className="numeral text-3xl text-accent">{price} CZK</p>
              </div>

              <div className="mt-5 flex flex-col gap-1.5">
                <label htmlFor="coupon-code" className="text-sm font-medium">
                  Coupon code (optional)
                </label>
                <input
                  id="coupon-code"
                  type="text"
                  value={couponCode}
                  onChange={(event) => onChangeCoupon(event.target.value)}
                  disabled={booking}
                  className="rounded-lg border border-border bg-bg px-3 py-2 text-text disabled:opacity-50"
                />
              </div>

              <button
                type="button"
                onClick={onConfirm}
                disabled={booking || !durationMinutes}
                className="btn-primary mt-5 w-full justify-center gap-2"
              >
                {booking ? "Booking..." : "Continue to payment"}
                <ArrowIcon />
              </button>

              <p className="mt-4 text-xs leading-relaxed text-text-muted">
                The slot is held for 10 minutes while you pay. Your gate code arrives by email right
                after.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
