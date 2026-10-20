import { prisma } from "../db/client.js";
import { releasePaymentIfPending } from "./payments.js";

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
