import { GATE_RATE_LIMIT_MAX_FAILURES, GATE_RATE_LIMIT_WINDOW_MINUTES } from "../config.js";

const WINDOW_MS = GATE_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;

const failuresByIp = new Map();

export function rateLimitGate(req, res, next) {
  const entry = failuresByIp.get(req.ip);
  const withinWindow = entry && Date.now() - entry.windowStart < WINDOW_MS;

  if (withinWindow && entry.count >= GATE_RATE_LIMIT_MAX_FAILURES) {
    console.error(`Gate code rate limit reached for ${req.ip}`);
    return res.status(429).json({ error: "Too many attempts. Try again later." });
  }
  next();
}

export function recordFailedGateAttempt(ip) {
  const entry = failuresByIp.get(ip);
  if (entry && Date.now() - entry.windowStart < WINDOW_MS) {
    entry.count += 1;
  } else {
    failuresByIp.set(ip, { count: 1, windowStart: Date.now() });
  }
}

export function resetGateRateLimiter() {
  failuresByIp.clear();
}
