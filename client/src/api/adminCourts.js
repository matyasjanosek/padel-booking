async function parseJsonOrThrow(res) {
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error || "Something went wrong");
  }
  return body;
}

export async function fetchAdminCourts() {
  const res = await fetch("/api/admin/courts");
  return parseJsonOrThrow(res);
}

export async function renameCourt(id, name) {
  const res = await fetch(`/api/admin/courts/${id}/rename`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return parseJsonOrThrow(res);
}

export async function setCourtActive(id, isActive) {
  const res = await fetch(`/api/admin/courts/${id}/${isActive ? "activate" : "deactivate"}`, {
    method: "POST",
  });
  return parseJsonOrThrow(res);
}
