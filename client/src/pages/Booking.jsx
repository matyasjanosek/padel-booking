import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchCourts } from "../api/courts.js";
import { fetchAvailability } from "../api/availability.js";
import { createBooking } from "../api/bookings.js";
import { formatSlot } from "../utils/formatSlot.js";
import { todayInPrague, addDays, formatDateHeading } from "../utils/date.js";
import SlotGrid from "../components/SlotGrid.jsx";

const today = todayInPrague();

export default function Booking() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const date = searchParams.get("date") || today;

  const [courts, setCourts] = useState([]);
  // { [courtId]: { slots, price } }
  const [availability, setAvailability] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [selectedSlot, setSelectedSlot] = useState(null); // { courtId, startTime, endTime }
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
    setBookingError("");
    setSearchParams({ date: newDate });
  }

  function courtName(courtId) {
    return courts.find((court) => court.id === courtId)?.name ?? `Court ${courtId}`;
  }

  function handleSelectSlot({ courtId, startTime, endTime }) {
    if (!user) {
      navigate("/login", { state: { from: `${location.pathname}${location.search}` } });
      return;
    }
    setBookingError("");
    setSelectedSlot({ courtId, startTime, endTime });
  }

  async function handleConfirmBooking() {
    setBooking(true);
    setBookingError("");
    try {
      const created = await createBooking({
        courtId: selectedSlot.courtId,
        startTime: selectedSlot.startTime,
      });
      navigate(`/booking/${created.id}/checkout`);
    } catch (err) {
      setBookingError(err.message);
      setSelectedSlot(null);
      loadAvailability();
    } finally {
      setBooking(false);
    }
  }

  const price = Object.values(availability)[0]?.price;

  return (
    <section className="px-5 py-12 md:max-w-page md:pl-24 md:pr-10 md:py-16">
      <h1 className="mb-4 text-4xl tracking-tight md:text-5xl">Booking</h1>
      <p className="max-w-[60ch] text-text-muted">
        Pick a day and a free slot on either court.
        {price != null && ` ${price} CZK per hour.`}
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => changeDate(addDays(date, -1))}
          disabled={date === today}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-text transition-colors duration-200 hover:border-accent hover:text-accent disabled:opacity-40"
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
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-text transition-colors duration-200 hover:border-accent hover:text-accent"
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
            <SlotGrid
              key={court.id}
              courtId={court.id}
              courtName={court.name}
              slots={availability[court.id]?.slots ?? []}
              selectedStartTime={selectedSlot?.courtId === court.id ? selectedSlot.startTime : null}
              onSelectSlot={handleSelectSlot}
            />
          ))}
        </div>
      )}

      {selectedSlot && (
        <div className="mt-8 max-w-sm rounded-lg border border-accent/60 bg-surface p-5">
          <p className="font-medium text-text">
            {courtName(selectedSlot.courtId)},{" "}
            {formatSlot(selectedSlot.startTime, selectedSlot.endTime)}
          </p>
          <p className="mt-1 text-text-muted">{price} CZK</p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleConfirmBooking}
              disabled={booking}
              className="rounded-full border border-accent bg-accent px-6 py-2.5 font-medium text-bg transition-opacity duration-200 disabled:opacity-50"
            >
              {booking ? "Booking..." : "Confirm booking"}
            </button>
            <button
              type="button"
              onClick={() => setSelectedSlot(null)}
              disabled={booking}
              className="rounded-full border border-border px-6 py-2.5 font-medium text-text transition-colors duration-200 hover:border-accent hover:text-accent disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
