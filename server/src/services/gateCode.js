import { randomInt } from "node:crypto";
import { GATE_CODE_DIGITS } from "../config.js";

// A random numeric code, never derived from the booking's id or any other
// predictable value, per the project's security rules.
export function generateGateCode() {
  const min = 10 ** (GATE_CODE_DIGITS - 1);
  const max = 10 ** GATE_CODE_DIGITS;
  return String(randomInt(min, max));
}
