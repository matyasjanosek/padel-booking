import { expireStaleHolds } from "../services/holdExpiry.js";
import { HOLD_EXPIRY_INTERVAL_SECONDS } from "../config.js";

// Runs expireStaleHolds on an interval, so a stale hold is reflected in the
// database even if nobody happens to read availability for that slot in the
// meantime. Started from index.js, not app.js, so the tests that build the
// app directly do not also start a background timer.
export function startHoldExpiryJob() {
  return setInterval(() => {
    expireStaleHolds().catch((error) => console.error("Hold expiry job failed:", error));
  }, HOLD_EXPIRY_INTERVAL_SECONDS * 1000);
}
