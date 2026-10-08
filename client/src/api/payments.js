async function parseJsonOrThrow(res) {
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error || "Something went wrong");
  }
  return body;
}

export async function createPaymentIntent(bookingId) {
  const res = await fetch(`/api/bookings/${bookingId}/pay`, { method: "POST" });
  return parseJsonOrThrow(res);
}
