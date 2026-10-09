async function parseJsonOrThrow(res) {
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error || "Something went wrong");
  }
  return body;
}

export async function fetchAvailability({ courtId, date }) {
  const res = await fetch(`/api/availability?courtId=${courtId}&date=${date}`);
  return parseJsonOrThrow(res);
}
