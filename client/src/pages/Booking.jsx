import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchCourts } from "../api/courts.js";
import { fetchAvailability } from "../api/availability.js";
import { createBooking } from "../api/bookings.js";
import { pragueHour } from "../utils/formatSlot.js";
import { todayInPrague } from "../utils/date.js";
import { MIN_BOOKING_MINUTES, MAX_BOOKING_MINUTES, TIME_BANDS } from "../constants/booking.js";
import PageHeading from "../components/PageHeading.jsx";
import DayPicker from "../components/DayPicker.jsx";
import BandTabs from "../components/BandTabs.jsx";
import BookingGrid from "../components/BookingGrid.jsx";
import BookingSummary from "../components/BookingSummary.jsx";

const today = todayInPrague();

// Every duration from the minimum up to the longest that both fits the
// slot's own free run and stays under MAX_BOOKING_MINUTES.
function durationOptions(maxUnits, unitMinutes) {
  const options = [];
  for (
    let minutes = MIN_BOOKING_MINUTES;
    minutes <= maxUnits * unitMinutes && minutes <= MAX_BOOKING_MINUTES;
    minutes += unitMinutes
  ) {
    options.push(minutes);
  }
  return options;
}

// The band containing the current time, only when looking at today; any
// other day opens on Morning.
function defaultBandKey(date) {
  if (date !== today) {
    return "morning";
  }
  const hour = pragueHour(new Date());
  const band = TIME_BANDS.find(
    (candidate) => hour >= candidate.startHour && hour < candidate.endHour,
  );
  return band?.key ?? "morning";
}

export default function Booking() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const date = searchParams.get("date") || today;
  // Set when arriving from a court's own link on the home page, so that
  // court's column is highlighted rather than the courts looking identical.
  const preselectedCourtId = Number(searchParams.get("court")) || null;

  const [courts, setCourts] = useState([]);
  // { [courtId]: { slots, unitMinutes, pricePerHour } }
  const [availability, setAvailability] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [bandKey, setBandKey] = useState(() => defaultBandKey(date));
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
    setBandKey(defaultBandKey(newDate));
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
    const opts = durationOptions(maxUnits, unitMinutes);
    setDurationMinutes(opts[0] ?? null);
  }

  function handleDeselectSlot() {
    setSelectedSlot(null);
    setDurationMinutes(null);
    setCouponCode("");
    setBookingError("");
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

  const band = TIME_BANDS.find((candidate) => candidate.key === bandKey) ?? TIME_BANDS[1];

  // Counted from the same availability already loaded for the grid, not a
  // second request: how many free, not-yet-past units fall in each band,
  // across every court.
  const freeCounts = useMemo(() => {
    const counts = Object.fromEntries(TIME_BANDS.map((candidate) => [candidate.key, 0]));
    courts.forEach((court) => {
      (availability[court.id]?.slots ?? []).forEach((slot) => {
        if (slot.status !== "free" || new Date(slot.startTime).getTime() <= Date.now()) {
          return;
        }
        const hour = pragueHour(slot.startTime);
        const candidate = TIME_BANDS.find((item) => hour >= item.startHour && hour < item.endHour);
        if (candidate) {
          counts[candidate.key] += 1;
        }
      });
    });
    return counts;
  }, [courts, availability]);

  return (
    <>
      <PageHeading
        title="Booking"
        intro={
          <>
            Pick a day, a court and a start time.
            {pricePerHour != null && ` ${pricePerHour} CZK per hour.`}
          </>
        }
      />

      <section className="px-5 pb-12 md:max-w-page md:pb-16 md:pl-24 md:pr-10">
        <DayPicker date={date} onChangeDate={changeDate} />

        <div className="mt-6">
          <BandTabs
            bands={TIME_BANDS}
            selectedKey={bandKey}
            onSelect={setBandKey}
            freeCounts={freeCounts}
          />
        </div>

        {bookingError && <p className="mt-6 text-sm text-danger">{bookingError}</p>}

        {loadError && <p className="mt-6 text-danger">{loadError}</p>}
        {!loadError && loading && <p className="mt-6 text-text-muted">Loading availability...</p>}

        {!loading && !loadError && (
          <div className="mt-6 grid gap-6 md:grid-cols-[1fr_22rem] md:items-start md:gap-8">
            <BookingGrid
              courts={courts}
              slotsByCourtId={availability}
              unitMinutes={unitMinutes}
              band={band}
              preselectedCourtId={preselectedCourtId}
              selectedSlot={selectedSlot}
              durationMinutes={durationMinutes}
              onSelectSlot={handleSelectSlot}
              onDeselectSlot={handleDeselectSlot}
            />
            <BookingSummary
              selectedSlot={selectedSlot}
              selectedEndTime={selectedEndTime}
              durationMinutes={durationMinutes}
              onChangeDuration={setDurationMinutes}
              options={options}
              courtName={selectedSlot ? courtName(selectedSlot.courtId) : ""}
              date={date}
              pricePerHour={pricePerHour}
              price={selectedPrice}
              couponCode={couponCode}
              onChangeCoupon={setCouponCode}
              booking={booking}
              onConfirm={handleConfirmBooking}
            />
          </div>
        )}
      </section>
    </>
  );
}
