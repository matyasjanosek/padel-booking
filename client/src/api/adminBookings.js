async function parseJsonOrThrow(res) {
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error || "Something went wrong");
  }
  return body;
}

export async function fetchAdminBookings({ status, courtId, date } = {}) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (courtId) params.set("courtId", courtId);
  if (date) params.set("date", date);

  const query = params.toString();
  const res = await fetch(`/api/admin/bookings${query ? `?${query}` : ""}`);
  return parseJsonOrThrow(res);
}

export async function rescheduleBooking(id, { courtId, startTime }) {
  const res = await fetch(`/api/admin/bookings/${id}/reschedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courtId, startTime }),
  });
  return parseJsonOrThrow(res);
}

export async function cancelBookingAsAdmin(id) {
  const res = await fetch(`/api/admin/bookings/${id}/cancel`, { method: "POST" });
  return parseJsonOrThrow(res);
}
