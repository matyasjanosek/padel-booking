async function parseJsonOrThrow(res) {
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error || "Something went wrong");
  }
  return body;
}

export async function fetchMyBookings() {
  const res = await fetch("/api/bookings");
  return parseJsonOrThrow(res);
}

export async function cancelBooking(id) {
  const res = await fetch(`/api/bookings/${id}/cancel`, { method: "POST" });
  return parseJsonOrThrow(res);
}
