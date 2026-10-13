import { randomInt } from "node:crypto";
import {
  GATE_CODE_DIGITS,
  GATE_CODE_VALID_BEFORE_MINUTES,
  GATE_CODE_VALID_AFTER_MINUTES,
} from "../config.js";

// A random numeric code, never derived from the booking's id or any other
// predictable value, per the project's security rules.
export function generateGateCode() {
  const min = 10 ** (GATE_CODE_DIGITS - 1);
  const max = 10 ** GATE_CODE_DIGITS;
  return String(randomInt(min, max));
}

// The gate code's validity window, measured from the slot's start time, not
// its end, see the config comment above these two constants. Shared by
// everything that needs to know the window: validating a code at the gate,
// the confirmation email, and showing it in the booking list.
export function gateCodeWindow(startTime) {
  const validFrom = new Date(startTime.getTime() - GATE_CODE_VALID_BEFORE_MINUTES * 60 * 1000);
  const validUntil = new Date(startTime.getTime() + GATE_CODE_VALID_AFTER_MINUTES * 60 * 1000);
  return { validFrom, validUntil };
}
