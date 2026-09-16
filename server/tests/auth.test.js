import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

process.env.SESSION_SECRET = "test-secret";

vi.mock("../src/services/auth.js", () => ({
  registerUser: vi.fn(),
  authenticateUser: vi.fn(),
  getUserById: vi.fn(),
  toPublicUser: (user) => {
    const { id, email, name, role, createdAt } = user;
    return { id, email, name, role, createdAt };
  },
}));

import { createApp } from "../src/app.js";
import { registerUser, authenticateUser, getUserById } from "../src/services/auth.js";

let server;
let baseUrl;

beforeAll(async () => {
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://localhost:${server.address().port}`;
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  vi.clearAllMocks();
});

function postJson(path, body) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validRegistration = { email: "player@example.com", password: "very-secret", name: "Alex" };
const fakeUser = {
  id: 1,
  email: "player@example.com",
  passwordHash: "hidden",
  name: "Alex",
  role: "member",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("POST /api/auth/register", () => {
  it("creates the account and sets a session cookie", async () => {
    registerUser.mockResolvedValue(fakeUser);

    const res = await postJson("/api/auth/register", validRegistration);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({
      id: 1,
      email: "player@example.com",
      name: "Alex",
      role: "member",
      createdAt: fakeUser.createdAt,
    });
    expect(body.passwordHash).toBeUndefined();
    expect(res.headers.get("set-cookie")).toMatch(/^session=.*HttpOnly/i);
  });

  it("rejects an invalid email without hitting the database", async () => {
    const res = await postJson("/api/auth/register", {
      ...validRegistration,
      email: "not-an-email",
    });

    expect(res.status).toBe(400);
    expect(registerUser).not.toHaveBeenCalled();
  });

  it("rejects a password shorter than 8 characters", async () => {
    const res = await postJson("/api/auth/register", { ...validRegistration, password: "short" });

    expect(res.status).toBe(400);
    expect(registerUser).not.toHaveBeenCalled();
  });

  it("rejects a missing name", async () => {
    const res = await postJson("/api/auth/register", { ...validRegistration, name: "  " });

    expect(res.status).toBe(400);
    expect(registerUser).not.toHaveBeenCalled();
  });

  it("returns 409 when the email is already registered", async () => {
    registerUser.mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" }),
    );

    const res = await postJson("/api/auth/register", validRegistration);

    expect(res.status).toBe(409);
  });
});

describe("POST /api/auth/login", () => {
  it("logs in with correct credentials and sets a session cookie", async () => {
    authenticateUser.mockResolvedValue(fakeUser);

    const res = await postJson("/api/auth/login", {
      email: fakeUser.email,
      password: "very-secret",
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toMatch(/^session=/);
  });

  it("gives the same response for a wrong password as for an unknown email", async () => {
    authenticateUser.mockResolvedValue(null);

    const wrongPassword = await postJson("/api/auth/login", {
      email: fakeUser.email,
      password: "wrong",
    });
    const unknownEmail = await postJson("/api/auth/login", {
      email: "nobody@example.com",
      password: "wrong",
    });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(await wrongPassword.json()).toEqual(await unknownEmail.json());
  });

  it("rejects a missing password", async () => {
    const res = await postJson("/api/auth/login", { email: fakeUser.email });

    expect(res.status).toBe(400);
    expect(authenticateUser).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/logout", () => {
  it("clears the session cookie", async () => {
    const res = await fetch(`${baseUrl}/api/auth/logout`, { method: "POST" });

    expect(res.status).toBe(204);
    expect(res.headers.get("set-cookie")).toMatch(/^session=;/);
  });
});

describe("GET /api/auth/me", () => {
  it("returns 401 without a session cookie", async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`);
    expect(res.status).toBe(401);
  });

  it("returns 401 for a tampered session cookie", async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: "session=1.not-the-real-signature" },
    });
    expect(res.status).toBe(401);
  });

  it("returns the logged in user for a valid session", async () => {
    authenticateUser.mockResolvedValue(fakeUser);
    const loginRes = await postJson("/api/auth/login", {
      email: fakeUser.email,
      password: "very-secret",
    });
    const cookie = loginRes.headers.get("set-cookie").split(";")[0];

    getUserById.mockResolvedValue(fakeUser);
    const meRes = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: cookie } });

    expect(meRes.status).toBe(200);
    const body = await meRes.json();
    expect(body.email).toBe(fakeUser.email);
    expect(body.passwordHash).toBeUndefined();
  });
});
