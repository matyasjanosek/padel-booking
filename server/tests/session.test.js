import { describe, it, expect, beforeAll } from "vitest";
import {
  setSessionCookie,
  clearSessionCookie,
  readSessionUserId,
  readCookie,
} from "../src/services/session.js";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret";
});

function fakeResponse() {
  return {
    cookieCalls: [],
    clearCalls: [],
    cookie(name, value, options) {
      this.cookieCalls.push({ name, value, options });
    },
    clearCookie(name) {
      this.clearCalls.push(name);
    },
  };
}

function requestWithCookie(value) {
  return { headers: { cookie: `session=${encodeURIComponent(value)}` } };
}

describe("setSessionCookie", () => {
  it("sets an httpOnly cookie that reads back to the same user id", () => {
    const res = fakeResponse();
    setSessionCookie(res, 42);

    expect(res.cookieCalls).toHaveLength(1);
    const { name, value, options } = res.cookieCalls[0];
    expect(name).toBe("session");
    expect(options.httpOnly).toBe(true);
    expect(readSessionUserId(requestWithCookie(value))).toBe(42);
  });
});

describe("readSessionUserId", () => {
  it("returns null when there is no session cookie", () => {
    expect(readSessionUserId({ headers: {} })).toBeNull();
  });

  it("returns null when the signed value has been tampered with", () => {
    const res = fakeResponse();
    setSessionCookie(res, 42);
    const { value } = res.cookieCalls[0];
    const tampered = value.replace(/^\d+/, "99");
    expect(readSessionUserId(requestWithCookie(tampered))).toBeNull();
  });

  it("returns null for a cookie with no signature at all", () => {
    expect(readSessionUserId(requestWithCookie("42"))).toBeNull();
  });
});

describe("clearSessionCookie", () => {
  it("clears the session cookie", () => {
    const res = fakeResponse();
    clearSessionCookie(res);
    expect(res.clearCalls).toEqual(["session"]);
  });
});

describe("readCookie", () => {
  it("reads a named cookie other than the session cookie", () => {
    const req = { headers: { cookie: "session=abc; google_oauth_state=xyz" } };
    expect(readCookie(req, "google_oauth_state")).toBe("xyz");
  });

  it("returns null when the named cookie is missing", () => {
    expect(readCookie({ headers: {} }, "google_oauth_state")).toBeNull();
  });
});
