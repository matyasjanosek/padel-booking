import { GATE_RATE_LIMIT_MAX_FAILURES, GATE_RATE_LIMIT_WINDOW_MINUTES } from "../config.js";

const WINDOW_MS = GATE_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;

// In memory only, per IP, counts reset if the server restarts; acceptable
// for a single process deployment and for codes that are only ever valid
// for a short window anyway. Only recordFailedAttempt below adds to this,
// see config.js for why a correct code must never count against it.
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

// Test only: the map above is otherwise private module state.
export function resetGateRateLimiter() {
  failuresByIp.clear();
}
