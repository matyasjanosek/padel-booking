import { CONTACT_RATE_LIMIT_MAX_MESSAGES, CONTACT_RATE_LIMIT_WINDOW_MINUTES } from "../config.js";

const WINDOW_MS = CONTACT_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;

const submissionsByIp = new Map();

export function rateLimitContact(req, res, next) {
  const entry = submissionsByIp.get(req.ip);
  const withinWindow = entry && Date.now() - entry.windowStart < WINDOW_MS;

  if (withinWindow && entry.count >= CONTACT_RATE_LIMIT_MAX_MESSAGES) {
    console.error(`Contact form rate limit reached for ${req.ip}`);
    return res.status(429).json({ error: "Too many messages. Try again later." });
  }

  if (withinWindow) {
    entry.count += 1;
  } else {
    submissionsByIp.set(req.ip, { count: 1, windowStart: Date.now() });
  }
  next();
}

export function resetContactRateLimiter() {
  submissionsByIp.clear();
}
