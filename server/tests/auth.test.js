import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

process.env.SESSION_SECRET = "test-secret";
process.env.CLIENT_URL = "http://localhost:5173";

vi.mock("../src/services/auth.js", () => ({
  registerUser: vi.fn(),
  authenticateUser: vi.fn(),
  getUserById: vi.fn(),
  toPublicUser: (user) => {
    const { id, email, name, role, createdAt } = user;
    return { id, email, name, role, createdAt };
  },
}));

vi.mock("../src/services/googleAuth.js", () => ({
  buildGoogleAuthUrl: vi.fn(
    (state) => `https://accounts.google.com/o/oauth2/v2/auth?state=${state}`,
  ),
  exchangeCodeForToken: vi.fn(),
  fetchGoogleUserInfo: vi.fn(),
  findOrCreateGoogleUser: vi.fn(),
}));

import { createApp } from "../src/app.js";
import { registerUser, authenticateUser, getUserById } from "../src/services/auth.js";
import {
  buildGoogleAuthUrl,
  exchangeCodeForToken,
  fetchGoogleUserInfo,
  findOrCreateGoogleUser,
} from "../src/services/googleAuth.js";

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

describe("GET /api/auth/google", () => {
  it("redirects to Google and sets a state cookie", async () => {
    const res = await fetch(`${baseUrl}/api/auth/google`, { redirect: "manual" });

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toMatch(/^https:\/\/accounts\.google\.com/);
    expect(res.headers.get("set-cookie")).toMatch(/^google_oauth_state=.*HttpOnly/i);
    expect(buildGoogleAuthUrl).toHaveBeenCalledWith(expect.any(String));
  });
});

describe("GET /api/auth/google/callback", () => {
  async function startGoogleLogin() {
    const startRes = await fetch(`${baseUrl}/api/auth/google`, { redirect: "manual" });
    const stateCookie = startRes.headers.get("set-cookie").split(";")[0];
    const state = stateCookie.split("=")[1];
    return { state, stateCookie };
  }

  it("logs the user in and redirects to the client on success", async () => {
    const { state, stateCookie } = await startGoogleLogin();
    exchangeCodeForToken.mockResolvedValue({ access_token: "token-123" });
    fetchGoogleUserInfo.mockResolvedValue({
      sub: "google-1",
      email: "player@example.com",
      email_verified: true,
      name: "Alex",
    });
    findOrCreateGoogleUser.mockResolvedValue(fakeUser);

    const res = await fetch(`${baseUrl}/api/auth/google/callback?code=abc&state=${state}`, {
      headers: { Cookie: stateCookie },
      redirect: "manual",
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("http://localhost:5173/account");
    // The response also clears the state cookie, so there are two Set-Cookie
    // headers; getSetCookie keeps them separate instead of joining them.
    expect(res.headers.getSetCookie().some((cookie) => cookie.startsWith("session="))).toBe(true);
    expect(findOrCreateGoogleUser).toHaveBeenCalledWith({
      googleId: "google-1",
      email: "player@example.com",
      name: "Alex",
    });
  });

  it("redirects to login with an error when the state does not match", async () => {
    const { stateCookie } = await startGoogleLogin();

    const res = await fetch(`${baseUrl}/api/auth/google/callback?code=abc&state=wrong-state`, {
      headers: { Cookie: stateCookie },
      redirect: "manual",
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("http://localhost:5173/login?error=google");
    expect(exchangeCodeForToken).not.toHaveBeenCalled();
  });

  it("redirects to login with an error when there is no code", async () => {
    const { state, stateCookie } = await startGoogleLogin();

    const res = await fetch(`${baseUrl}/api/auth/google/callback?state=${state}`, {
      headers: { Cookie: stateCookie },
      redirect: "manual",
    });

    expect(res.headers.get("location")).toBe("http://localhost:5173/login?error=google");
    expect(exchangeCodeForToken).not.toHaveBeenCalled();
  });

  it("redirects to login with an error when Google's email is not verified", async () => {
    const { state, stateCookie } = await startGoogleLogin();
    exchangeCodeForToken.mockResolvedValue({ access_token: "token-123" });
    fetchGoogleUserInfo.mockResolvedValue({
      sub: "google-2",
      email: "unverified@example.com",
      email_verified: false,
      name: "Nobody",
    });

    const res = await fetch(`${baseUrl}/api/auth/google/callback?code=abc&state=${state}`, {
      headers: { Cookie: stateCookie },
      redirect: "manual",
    });

    expect(res.headers.get("location")).toBe("http://localhost:5173/login?error=google");
    expect(findOrCreateGoogleUser).not.toHaveBeenCalled();
  });

  it("redirects to login with an error when the token exchange fails", async () => {
    const { state, stateCookie } = await startGoogleLogin();
    exchangeCodeForToken.mockRejectedValue(new Error("Google said no"));

    const res = await fetch(`${baseUrl}/api/auth/google/callback?code=abc&state=${state}`, {
      headers: { Cookie: stateCookie },
      redirect: "manual",
    });

    expect(res.headers.get("location")).toBe("http://localhost:5173/login?error=google");
  });
});
