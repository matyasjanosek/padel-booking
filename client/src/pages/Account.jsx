import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchMyBookings, cancelBooking } from "../api/bookings.js";
import { fetchCourts } from "../api/courts.js";
import { formatSlot } from "../utils/formatSlot.js";

const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  expired: "Expired",
};

const CANCELLABLE_STATUSES = ["pending", "confirmed"];

export default function Account() {
  const { user } = useAuth();
  const [courts, setCourts] = useState([]);
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState("");
  // The booking currently asking "are you sure", separate from the one
  // actually being cancelled, so a single click can never cancel a booking.
  const [confirmingId, setConfirmingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    fetchCourts()
      .then(setCourts)
      .catch(() => {});
    fetchMyBookings()
      .then(setBookings)
      .catch(() => setError("Your bookings could not be loaded right now."));
  }, []);

  function courtName(courtId) {
    return courts.find((court) => court.id === courtId)?.name ?? `Court ${courtId}`;
  }

  async function handleCancel(id) {
    setError("");
    setConfirmingId(null);
    setCancellingId(id);
    try {
      const updated = await cancelBooking(id);
      setBookings((current) => current.map((booking) => (booking.id === id ? updated : booking)));
    } catch (err) {
      setError(err.message);
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <section className="px-5 py-12 md:max-w-page md:pl-24 md:pr-10 md:py-16">
      <h1 className="mb-4 text-4xl tracking-tight md:text-5xl">Account</h1>
      <p className="max-w-[60ch] text-text-muted">Your account details.</p>

      <dl className="mt-8 max-w-sm space-y-4">
        <div>
          <dt className="text-sm text-text-muted">Name</dt>
          <dd className="text-text">{user.name}</dd>
        </div>
        <div>
          <dt className="text-sm text-text-muted">Email</dt>
          <dd className="text-text">{user.email}</dd>
        </div>
      </dl>

      <h2 className="mb-3 mt-12 text-2xl">Your bookings</h2>

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      {bookings === null ? (
        <p className="text-text-muted">Loading your bookings...</p>
      ) : bookings.length === 0 ? (
        <p className="text-text-muted">You have no bookings yet.</p>
      ) : (
        <ul className="flex max-w-xl flex-col gap-3">
          {bookings.map((booking) => (
            <li
              key={booking.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3"
            >
              <div>
                <p className="font-medium text-text">
                  {courtName(booking.courtId)}, {formatSlot(booking.startTime, booking.endTime)}
                </p>
                <p className="text-sm text-text-muted">
                  {STATUS_LABELS[booking.status]}, {booking.price} CZK
                </p>
              </div>
              {CANCELLABLE_STATUSES.includes(booking.status) &&
                (confirmingId === booking.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-text-muted">Cancel this booking?</span>
                    <button
                      type="button"
                      onClick={() => handleCancel(booking.id)}
                      disabled={cancellingId === booking.id}
                      className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-danger transition-colors duration-200 hover:border-danger disabled:opacity-50"
                    >
                      {cancellingId === booking.id ? "Cancelling..." : "Yes, cancel"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(null)}
                      className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-text transition-colors duration-200 hover:border-accent hover:text-accent"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingId(booking.id)}
                    className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-text transition-colors duration-200 hover:border-accent hover:text-accent"
                  >
                    Cancel
                  </button>
                ))}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
