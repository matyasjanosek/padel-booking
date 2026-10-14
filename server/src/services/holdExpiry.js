import { prisma } from "../db/client.js";
import { releasePaymentIfPending } from "./payments.js";

// Flips every pending booking whose hold has passed to expired, releasing
// its court_slots rows in the same transaction as the status change, so the
// slot is free again, for anyone, the instant each one commits. Releasing
// the payment runs after, for each booking in turn: a call to Stripe cannot
// be part of a database transaction, and it is what keeps a later request
// for the same slot from being handed this abandoned payment intent. Returns
// how many bookings were expired.
export async function expireStaleHolds() {
  const stale = await prisma.booking.findMany({
    where: { status: "pending", holdExpiresAt: { lt: new Date() } },
    select: { id: true },
  });

  for (const { id } of stale) {
    await prisma.$transaction(async (tx) => {
      await tx.booking.update({ where: { id }, data: { status: "expired" } });
      await tx.courtSlot.deleteMany({ where: { bookingId: id } });
    });
    await releasePaymentIfPending(id);
  }

  return stale.length;
}
