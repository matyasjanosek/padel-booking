export async function fetchCourts() {
  const res = await fetch("/api/courts");
  if (!res.ok) {
    throw new Error("Could not load courts");
  }
  return res.json();
}
