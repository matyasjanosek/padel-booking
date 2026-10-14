import { prisma } from "../db/client.js";
import { gateCodeWindow } from "./gateCode.js";
import { openGate } from "../hardware/index.js";

// Checked here, not only in the query below, so this still holds even if
// that query's own status filter is ever changed: a booking that is not
// confirmed right now never grants access, whatever its code or window.
function isUsable(booking, now) {
  if (booking.status !== "confirmed") {
    return false;
  }
  const { validFrom, validUntil } = gateCodeWindow(booking.startTime, booking.endTime);
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
  const match = bookings.find((booking) => isUsable(booking, now));
  if (!match) {
    return { granted: false };
  }

  openGate({ bookingId: match.id });
  return { granted: true };
}
