import { randomInt } from "node:crypto";
import {
  GATE_CODE_DIGITS,
  GATE_CODE_VALID_BEFORE_MINUTES,
  GATE_CODE_VALID_AFTER_END_MINUTES,
} from "../config.js";

export function generateGateCode() {
  const min = 10 ** (GATE_CODE_DIGITS - 1);
  const max = 10 ** GATE_CODE_DIGITS;
  return String(randomInt(min, max));
}

export function gateCodeWindow(startTime, endTime) {
  const validFrom = new Date(startTime.getTime() - GATE_CODE_VALID_BEFORE_MINUTES * 60 * 1000);
  const validUntil = new Date(endTime.getTime() + GATE_CODE_VALID_AFTER_END_MINUTES * 60 * 1000);
  return { validFrom, validUntil };
}
