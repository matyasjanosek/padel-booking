import { expireStaleHolds } from "../services/holdExpiry.js";
import { HOLD_EXPIRY_INTERVAL_SECONDS } from "../config.js";

export function startHoldExpiryJob() {
  return setInterval(() => {
    expireStaleHolds().catch((error) => console.error("Hold expiry job failed:", error));
  }, HOLD_EXPIRY_INTERVAL_SECONDS * 1000);
}
