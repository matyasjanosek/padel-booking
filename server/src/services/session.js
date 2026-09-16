import { createHmac, timingSafeEqual } from "node:crypto";

// The whole session is this one signed cookie, there is no session store.
// The value is the user id, so no other request state needs to be looked up
// to know who is asking, only whether the signature still matches.
const COOKIE_NAME = "session";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function sign(value) {
  const signature = createHmac("sha256", process.env.SESSION_SECRET).update(value).digest("hex");
  return `${value}.${signature}`;
}

function verify(signedValue) {
  const separator = signedValue.lastIndexOf(".");
  if (separator === -1) {
    return null;
  }
  const value = signedValue.slice(0, separator);
  const expected = sign(value);
  const actual = Buffer.from(signedValue);
  const expectedBuffer = Buffer.from(expected);
  if (actual.length !== expectedBuffer.length || !timingSafeEqual(actual, expectedBuffer)) {
    return null;
  }
  return value;
}

function parseCookies(header) {
  const cookies = {};
  if (!header) {
    return cookies;
  }
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    cookies[name] = decodeURIComponent(value);
  }
  return cookies;
}

export function setSessionCookie(res, userId) {
  res.cookie(COOKIE_NAME, sign(String(userId)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_MS,
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

export function readCookie(req, name) {
  return parseCookies(req.headers.cookie)[name] || null;
}

export function readSessionUserId(req) {
  const signedValue = readCookie(req, COOKIE_NAME);
  if (!signedValue) {
    return null;
  }
  const userId = verify(signedValue);
  return userId ? Number(userId) : null;
}
