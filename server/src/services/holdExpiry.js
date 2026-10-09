import { prisma } from "../db/client.js";
import { releasePaymentIfPending } from "./payments.js";

// Flips every pending booking whose hold has passed to expired, and releases
// any still pending payment for each one, see releasePaymentIfPending. Flipping
// status alone does not free a booking's (court_id, start_time) slot, MySQL's
// unique index does not care about status, that happens separately when
// createBooking reclaims a stale row on conflict; releasing the payment is
// what keeps that reclaim from also handing the slot's new occupant someone
// else's abandoned payment intent. Returns how many bookings were expired.
export async function expireStaleHolds() {
  const stale = await prisma.booking.findMany({
    where: { status: "pending", holdExpiresAt: { lt: new Date() } },
    select: { id: true },
  });
  if (stale.length === 0) {
    return 0;
  }

  const ids = stale.map((booking) => booking.id);
  await prisma.booking.updateMany({
    where: { id: { in: ids } },
    data: { status: "expired" },
  });

  for (const id of ids) {
    await releasePaymentIfPending(id);
  }

  return ids.length;
}
