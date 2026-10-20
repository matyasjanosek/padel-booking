import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchCourts } from "../api/courts.js";
import { fetchAvailability } from "../api/availability.js";
import { createBooking } from "../api/bookings.js";
import { formatSlot, formatTime, formatDuration } from "../utils/formatSlot.js";
import { todayInPrague, addDays, formatDateHeading } from "../utils/date.js";
import SlotGrid from "../components/SlotGrid.jsx";

const today = todayInPrague();

// The shortest a booking can be. Mirrors the server's own MIN_BOOKING_MINUTES
// in config.js: the server is what actually enforces this, this is only
// for building the list of durations to offer.
const MIN_BOOKING_MINUTES = 60;

// Every duration from the minimum up to as many units as the slot has free
// after it, in steps of one unit. Empty when even the minimum does not fit,
// for example the last unit or two of the day.
function durationOptions(maxUnits, unitMinutes) {
  const options = [];
  for (
    let minutes = MIN_BOOKING_MINUTES;
    minutes <= maxUnits * unitMinutes;
    minutes += unitMinutes
  ) {
    options.push(minutes);
  }
  return options;
}

export default function Booking() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const date = searchParams.get("date") || today;
  // Set when arriving from a court's own link on the home page, so that
  // court's grid is highlighted rather than the two courts looking identical.
  const preselectedCourtId = Number(searchParams.get("court")) || null;

  const [courts, setCourts] = useState([]);
  // { [courtId]: { slots, unitMinutes, pricePerHour } }
  const [availability, setAvailability] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [selectedSlot, setSelectedSlot] = useState(null); // { courtId, startTime, maxUnits }
  const [durationMinutes, setDurationMinutes] = useState(null);
  const [couponCode, setCouponCode] = useState("");
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState("");

  useEffect(() => {
    fetchCourts()
      .then(setCourts)
      .catch(() => {
        setLoadError("Courts could not be loaded right now.");
        setLoading(false);
      });
  }, []);

  const loadAvailability = useCallback(() => {
    if (courts.length === 0) {
      return;
    }
    setLoading(true);
    setLoadError("");
    Promise.all(courts.map((court) => fetchAvailability({ courtId: court.id, date })))
      .then((results) => {
        const next = {};
        courts.forEach((court, index) => {
          next[court.id] = results[index];
        });
        setAvailability(next);
      })
      .catch(() => setLoadError("Availability could not be loaded right now."))
      .finally(() => setLoading(false));
  }, [courts, date]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  function changeDate(newDate) {
    setSelectedSlot(null);
    setDurationMinutes(null);
    setCouponCode("");
    setBookingError("");
    setSearchParams({ date: newDate });
  }

  function courtName(courtId) {
    return courts.find((court) => court.id === courtId)?.name ?? `Court ${courtId}`;
  }

  const unitMinutes = Object.values(availability)[0]?.unitMinutes;
  const pricePerHour = Object.values(availability)[0]?.pricePerHour;

  function handleSelectSlot({ courtId, startTime, maxUnits }) {
    if (!user) {
      navigate("/login", { state: { from: `${location.pathname}${location.search}` } });
      return;
    }
    setBookingError("");
    setSelectedSlot({ courtId, startTime, maxUnits });
    const options = durationOptions(maxUnits, unitMinutes);
    setDurationMinutes(options[0] ?? null);
  }

  async function handleConfirmBooking() {
    setBooking(true);
    setBookingError("");
    try {
      const created = await createBooking({
        courtId: selectedSlot.courtId,
        startTime: selectedSlot.startTime,
        durationMinutes,
        couponCode: couponCode.trim() || undefined,
      });
      navigate(`/booking/${created.id}/checkout`);
    } catch (err) {
      setBookingError(err.message);
      setSelectedSlot(null);
      setDurationMinutes(null);
      loadAvailability();
    } finally {
      setBooking(false);
    }
  }

  const options = selectedSlot ? durationOptions(selectedSlot.maxUnits, unitMinutes) : [];
  const selectedEndTime =
    selectedSlot && durationMinutes
      ? new Date(
          new Date(selectedSlot.startTime).getTime() + durationMinutes * 60 * 1000,
        ).toISOString()
      : null;
  const selectedPrice = durationMinutes ? (durationMinutes / 60) * pricePerHour : null;

  return (
    <section
      className={`px-5 py-12 md:max-w-page md:pl-24 md:pr-10 md:py-16 ${selectedSlot ? "pb-64 md:pb-16" : ""}`}
    >
      <h1 className="mb-4 text-4xl tracking-tight md:text-5xl">Booking</h1>
      <p className="max-w-[60ch] text-text-muted">
        Pick a day and a free slot on either court.
        {pricePerHour != null && ` ${pricePerHour} CZK per hour.`}
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => changeDate(addDays(date, -1))}
          disabled={date === today}
          className="btn-secondary btn-sm"
        >
          ‹ Previous day
        </button>
        <input
          type="date"
          value={date}
          min={today}
          onChange={(event) => changeDate(event.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text focus:border-accent focus:outline-none"
        />
        <button
          type="button"
          onClick={() => changeDate(addDays(date, 1))}
          className="btn-secondary btn-sm"
        >
          Next day ›
        </button>
      </div>
      <p className="mt-2 text-sm text-text-muted">{formatDateHeading(date)}</p>

      {bookingError && <p className="mt-4 text-sm text-danger">{bookingError}</p>}

      {loadError && <p className="mt-6 text-danger">{loadError}</p>}
      {!loadError && loading && <p className="mt-6 text-text-muted">Loading availability...</p>}

      {!loading && !loadError && (
        <div className="mt-8 grid gap-10 md:grid-cols-2">
          {courts.map((court) => (
            <div
              key={court.id}
              className={`rounded-lg border p-4 ${
                court.id === preselectedCourtId ? "border-accent/60" : "border-transparent"
              }`}
            >
              <SlotGrid
                courtId={court.id}
                courtName={court.name}
                slots={availability[court.id]?.slots ?? []}
                unitMinutes={unitMinutes}
                selectedStartTime={
                  selectedSlot?.courtId === court.id ? selectedSlot.startTime : null
                }
                onSelectSlot={handleSelectSlot}
              />
            </div>
          ))}
        </div>
      )}

      {/* Pinned once a slot is chosen, so the slot and the price stay
          visible */}
      {selectedSlot && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-accent/60 bg-surface p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.4)] sm:px-8 md:inset-x-auto md:bottom-8 md:right-10 md:w-80 md:rounded-lg md:border md:p-5 md:shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
          <p className="font-medium text-text">
            {courtName(selectedSlot.courtId)}, {formatTime(selectedSlot.startTime)}
          </p>

          {options.length === 0 ? (
            <p className="mt-2 text-sm text-danger">
              No booking length fits from this start, pick an earlier one.
            </p>
          ) : (
            <>
              <div className="mt-3 flex flex-wrap items-end gap-3 md:flex-col md:items-stretch md:gap-1.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" htmlFor="duration">
                    Duration
                  </label>
                  <select
                    id="duration"
                    value={durationMinutes ?? ""}
                    onChange={(event) => setDurationMinutes(Number(event.target.value))}
                    disabled={booking}
                    className="rounded-lg border border-border bg-bg px-3 py-2 text-text disabled:opacity-50"
                  >
                    {options.map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {formatDuration(minutes)}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="numeral text-2xl text-accent md:mt-1">
                  {selectedPrice} <span className="text-sm text-text-muted">CZK</span>
                </p>
              </div>
              {selectedEndTime && (
                <p className="mt-2 text-sm text-text-muted">
                  {formatSlot(selectedSlot.startTime, selectedEndTime)}
                </p>
              )}
              <div className="mt-3 flex flex-col gap-1.5">
                <label className="text-sm font-medium" htmlFor="coupon-code">
                  Coupon code (optional)
                </label>
                <input
                  id="coupon-code"
                  type="text"
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value)}
                  disabled={booking}
                  className="rounded-lg border border-border bg-bg px-3 py-2 text-text disabled:opacity-50"
                />
              </div>
            </>
          )}

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleConfirmBooking}
              disabled={booking || !durationMinutes}
              className="btn-primary"
            >
              {booking ? "Booking..." : "Confirm booking"}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedSlot(null);
                setDurationMinutes(null);
                setCouponCode("");
              }}
              disabled={booking}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
