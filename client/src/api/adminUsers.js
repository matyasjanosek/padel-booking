async function parseJsonOrThrow(res) {
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error || "Something went wrong");
  }
  return body;
}

export async function fetchAdminUsers() {
  const res = await fetch("/api/admin/users");
  return parseJsonOrThrow(res);
}

export async function changeUserRole(id, role) {
  const res = await fetch(`/api/admin/users/${id}/role`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  return parseJsonOrThrow(res);
}
