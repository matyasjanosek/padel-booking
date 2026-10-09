import { prisma } from "../db/client.js";
import { GATE_CODE_VALID_BEFORE_MINUTES, GATE_CODE_VALID_AFTER_MINUTES } from "../config.js";
import { openGate } from "../hardware/index.js";

const BEFORE_MS = GATE_CODE_VALID_BEFORE_MINUTES * 60 * 1000;
const AFTER_MS = GATE_CODE_VALID_AFTER_MINUTES * 60 * 1000;

function isWithinGateWindow(startTime, now) {
  const validFrom = new Date(startTime.getTime() - BEFORE_MS);
  const validUntil = new Date(startTime.getTime() + AFTER_MS);
  return now >= validFrom && now <= validUntil;
}

// gate_code has no unique constraint, codes are random with no uniqueness
// check at generation time, so two different confirmed bookings could in
// theory share a code. findMany and checking each one's own window handles
// that correctly instead of findUnique picking an arbitrary one. A code
// that matches nothing, matches a booking outside its window, or matches a
// booking that was never actually confirmed, are all rejected the same way,
// nothing about the response says which.
export async function validateGateCode(code) {
  const bookings = await prisma.booking.findMany({
    where: { gateCode: code, status: "confirmed" },
  });

  const now = new Date();
  const match = bookings.find((booking) => isWithinGateWindow(booking.startTime, now));
  if (!match) {
    return { granted: false };
  }

  openGate({ bookingId: match.id });
  return { granted: true };
}
