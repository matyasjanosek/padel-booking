import { prisma } from "../db/client.js";
import { gateCodeWindow } from "./gateCode.js";
import { openGate } from "../hardware/index.js";

function isUsable(booking, now) {
  if (booking.status !== "confirmed") {
    return false;
  }
  const { validFrom, validUntil } = gateCodeWindow(booking.startTime, booking.endTime);
  return now >= validFrom && now <= validUntil;
}

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
