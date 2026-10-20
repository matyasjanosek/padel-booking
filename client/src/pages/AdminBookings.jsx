import { Fragment, useEffect, useState } from "react";
import {
  fetchAdminBookings,
  rescheduleBooking,
  cancelBookingAsAdmin,
} from "../api/adminBookings.js";
import { fetchCourts } from "../api/courts.js";
import { fetchAvailability } from "../api/availability.js";
import { formatSlot, formatTime } from "../utils/formatSlot.js";

const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  expired: "Expired",
};
const STATUS_OPTIONS = ["pending", "confirmed", "cancelled", "expired"];
const CANCELLABLE_STATUSES = ["pending", "confirmed"];
const RESCHEDULABLE_STATUSES = ["pending", "confirmed"];

function RescheduleForm({ booking, courts, onCancel, onSaved }) {
  const [courtId, setCourtId] = useState(booking.courtId);
  const [date, setDate] = useState(booking.startTime.slice(0, 10));
  const [slots, setSlots] = useState(null);
  const [startTime, setStartTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSlots(null);
    setStartTime("");
    fetchAvailability({ courtId, date })
      .then((data) => setSlots(data.slots))
      .catch(() => setError("Could not load availability for that day."));
  }, [courtId, date]);

  async function handleSave() {
    if (!startTime) {
      setError("Pick a time.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const updated = await rescheduleBooking(booking.id, { courtId, startTime });
      onSaved(updated);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-accent/60 bg-surface p-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor={`court-${booking.id}`}>
          Court
        </label>
        <select
          id={`court-${booking.id}`}
          value={courtId}
          onChange={(event) => setCourtId(Number(event.target.value))}
          className="rounded-lg border border-border bg-bg px-3 py-2 text-text"
        >
          {courts.map((court) => (
            <option key={court.id} value={court.id}>
              {court.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor={`date-${booking.id}`}>
          Date
        </label>
        <input
          id={`date-${booking.id}`}
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="rounded-lg border border-border bg-bg px-3 py-2 text-text"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor={`time-${booking.id}`}>
          Time
        </label>
        <select
          id={`time-${booking.id}`}
          value={startTime}
          onChange={(event) => setStartTime(event.target.value)}
          disabled={!slots}
          className="rounded-lg border border-border bg-bg px-3 py-2 text-text disabled:opacity-50"
        >
          <option value="">{slots ? "Choose a time" : "Loading..."}</option>
          {slots?.map((slot) => (
            <option key={slot.startTime} value={slot.startTime} disabled={slot.status === "taken"}>
              {formatTime(slot.startTime)}
              {slot.status === "taken" ? " (taken)" : ""}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="w-full text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full border border-accent bg-accent px-5 py-2 font-medium text-bg disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-full border border-border px-5 py-2 font-medium text-text transition-colors duration-200 hover:border-accent hover:text-accent disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function AdminBookings() {
  const [courts, setCourts] = useState([]);
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [courtFilter, setCourtFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    fetchCourts()
      .then(setCourts)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setBookings(null);
    setError("");
    setEditingId(null);
    setConfirmingId(null);
    fetchAdminBookings({ status: statusFilter, courtId: courtFilter, date: dateFilter })
      .then(setBookings)
      .catch((err) => setError(err.message));
  }, [statusFilter, courtFilter, dateFilter]);

  function handleSaved(updated) {
    setBookings((current) =>
      current.map((booking) => (booking.id === updated.id ? updated : booking)),
    );
    setEditingId(null);
  }

  async function handleCancel(id) {
    setError("");
    setConfirmingId(null);
    setCancellingId(id);
    try {
      const updated = await cancelBookingAsAdmin(id);
      setBookings((current) => current.map((booking) => (booking.id === id ? updated : booking)));
    } catch (err) {
      setError(err.message);
    } finally {
      setCancellingId(null);
    }
  }

  const hasActiveFilters = statusFilter || courtFilter || dateFilter;

  return (
    <section className="px-5 py-12 md:max-w-page md:pl-24 md:pr-10 md:py-16">
      <h1 className="mb-4 text-4xl tracking-tight md:text-5xl">Bookings</h1>
      <p className="mb-8 max-w-[60ch] text-text-muted">All bookings across both courts.</p>

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="status-filter">
            Status
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-text"
          >
            <option value="">All</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="court-filter">
            Court
          </label>
          <select
            id="court-filter"
            value={courtFilter}
            onChange={(event) => setCourtFilter(event.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-text"
          >
            <option value="">All</option>
            {courts.map((court) => (
              <option key={court.id} value={court.id}>
                {court.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="date-filter">
            Date
          </label>
          <input
            id="date-filter"
            type="date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-text"
          />
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setStatusFilter("");
              setCourtFilter("");
              setDateFilter("");
            }}
            className="text-sm text-text-muted hover:text-text"
          >
            Clear filters
          </button>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      {bookings === null ? (
        <p className="text-text-muted">Loading bookings...</p>
      ) : bookings.length === 0 ? (
        <p className="text-text-muted">No bookings match these filters.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border text-sm text-text-muted">
                <th className="py-2 pr-3 font-normal">Player</th>
                <th className="py-2 pr-3 font-normal">Court</th>
                <th className="py-2 pr-3 font-normal">Time</th>
                <th className="py-2 pr-3 font-normal">Status</th>
                <th className="py-2 pr-3 font-normal">Price</th>
                <th className="py-2 font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <Fragment key={booking.id}>
                  <tr className="border-b border-border/60 align-top">
                    <td className="py-3 pr-3">
                      <p className="font-medium text-text">{booking.user.name}</p>
                      <p className="text-sm text-text-muted">{booking.user.email}</p>
                    </td>
                    <td className="py-3 pr-3 text-text">{booking.courtName}</td>
                    <td className="py-3 pr-3 text-text">
                      {formatSlot(booking.startTime, booking.endTime)}
                    </td>
                    <td className="py-3 pr-3 text-text">{STATUS_LABELS[booking.status]}</td>
                    <td className="py-3 pr-3 text-text">{booking.price} CZK</td>
                    <td className="py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {RESCHEDULABLE_STATUSES.includes(booking.status) && (
                          <button
                            type="button"
                            onClick={() =>
                              setEditingId(editingId === booking.id ? null : booking.id)
                            }
                            className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-text transition-colors duration-200 hover:border-accent hover:text-accent"
                          >
                            Change
                          </button>
                        )}
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
                      </div>
                    </td>
                  </tr>
                  {editingId === booking.id && (
                    <tr>
                      <td colSpan={6}>
                        <RescheduleForm
                          booking={booking}
                          courts={courts}
                          onCancel={() => setEditingId(null)}
                          onSaved={handleSaved}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
