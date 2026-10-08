import { prisma } from "../db/client.js";

// Flips every pending booking whose hold has passed to expired. This alone
// does not free its (court_id, start_time) slot, MySQL's unique index does
// not care about status, that happens separately when createBooking
// reclaims a stale row on conflict. This keeps the stored status accurate
// for anyone reading a booking directly, for example an account page or
// admin view. Returns how many bookings were expired.
export async function expireStaleHolds() {
  const result = await prisma.booking.updateMany({
    where: { status: "pending", holdExpiresAt: { lt: new Date() } },
    data: { status: "expired" },
  });
  return result.count;
}
