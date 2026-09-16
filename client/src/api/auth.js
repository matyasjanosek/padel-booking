async function parseJsonOrThrow(res) {
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error || "Something went wrong");
  }
  return body;
}

export async function register({ email, password, name }) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  return parseJsonOrThrow(res);
}

export async function login({ email, password }) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return parseJsonOrThrow(res);
}

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
}

export async function fetchMe() {
  const res = await fetch("/api/auth/me");
  if (res.status === 401) {
    return null;
  }
  return parseJsonOrThrow(res);
}
