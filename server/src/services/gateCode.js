import { randomInt } from "node:crypto";
import {
  GATE_CODE_DIGITS,
  GATE_CODE_VALID_BEFORE_MINUTES,
  GATE_CODE_VALID_AFTER_END_MINUTES,
} from "../config.js";

// A random numeric code, never derived from the booking's id or any other
// predictable value, per the project's security rules.
export function generateGateCode() {
  const min = 10 ** (GATE_CODE_DIGITS - 1);
  const max = 10 ** GATE_CODE_DIGITS;
  return String(randomInt(min, max));
}

// The gate code's validity window, covering the whole booking: a margin
// before its start and a shorter one after its end, see the config comment
// above these two constants. Grows with the booking's own length, since it
// is derived from both ends, not a fixed offset from the start. Shared by
// everything that needs to know the window: validating a code at the gate,
// the confirmation email, and showing it in the booking list.
export function gateCodeWindow(startTime, endTime) {
  const validFrom = new Date(startTime.getTime() - GATE_CODE_VALID_BEFORE_MINUTES * 60 * 1000);
  const validUntil = new Date(endTime.getTime() + GATE_CODE_VALID_AFTER_END_MINUTES * 60 * 1000);
  return { validFrom, validUntil };
}
