import { prisma } from "../db/client.js";
import { generateGateCode } from "./gateCode.js";

// Stripe can redeliver the same event more than once, and a booking's
// payment can be released out from under it if its hold expired or it was
// cancelled before Stripe's event arrived (see releasePaymentIfPending).
// Every handler below re-checks the booking and its payment are still in
// the exact state the event expects before changing anything, so a late or
// duplicate event can never confirm, fail or touch a booking it no longer
// belongs to.
export async function handleStripeEvent(event) {
  if (event.type === "payment_intent.succeeded") {
    await handlePaymentSucceeded(event.data.object);
  } else if (event.type === "payment_intent.payment_failed") {
    await handlePaymentFailed(event.data.object);
  }
  // Any other event type is acknowledged but otherwise ignored.
}

async function handlePaymentSucceeded(paymentIntent) {
  const booking = await findBookingForIntent(paymentIntent);
  if (!isCurrentPendingPayment(booking, paymentIntent)) {
    return;
  }

  await prisma.$transaction([
    prisma.booking.update({
      where: { id: booking.id },
      data: { status: "confirmed", gateCode: generateGateCode() },
    }),
    prisma.payment.update({
      where: { bookingId: booking.id },
      data: { status: "succeeded" },
    }),
  ]);
}

async function handlePaymentFailed(paymentIntent) {
  const booking = await findBookingForIntent(paymentIntent);
  if (!isCurrentPendingPayment(booking, paymentIntent)) {
    return;
  }

  await prisma.payment.update({
    where: { bookingId: booking.id },
    data: { status: "failed" },
  });
}

function findBookingForIntent(paymentIntent) {
  const bookingId = Number(paymentIntent.metadata.bookingId);
  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true },
  });
}

// True only while this event's payment intent is still the one actually
// attached to the booking, and nothing has processed it yet: the booking
// may have been reclaimed by a different attempt since this intent was
// created, and Stripe may redeliver the same event more than once.
function isCurrentPendingPayment(booking, paymentIntent) {
  return (
    booking?.status === "pending" &&
    booking.payment?.stripePaymentIntentId === paymentIntent.id &&
    booking.payment.status === "pending"
  );
}
