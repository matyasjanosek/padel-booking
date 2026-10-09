import { prisma } from "../db/client.js";
import { generateGateCode } from "./gateCode.js";
import { sendBookingConfirmationEmail } from "./bookingConfirmationEmail.js";

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

  const [confirmedBooking] = await prisma.$transaction([
    prisma.booking.update({
      where: { id: booking.id },
      data: { status: "confirmed", gateCode: generateGateCode() },
      include: { user: true, court: true },
    }),
    prisma.payment.update({
      where: { bookingId: booking.id },
      data: { status: "succeeded" },
    }),
  ]);

  // The booking is already paid and confirmed at this point. A failed email
  // must not undo that or fail the webhook, Stripe would just retry an
  // event that already succeeded, so only the send itself is best effort.
  try {
    await sendBookingConfirmationEmail(confirmedBooking);
  } catch (error) {
    console.error("Booking confirmation email failed:", error.message);
  }
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

// Null means there is nothing this event can do, either its metadata never
// named a real booking (for example a synthetic `stripe trigger` event, which
// carries no metadata at all) or that booking no longer exists. Both are
// logged and treated as "acknowledge and do nothing", not a processing
// failure, so Stripe is not left retrying an event that can never succeed.
async function findBookingForIntent(paymentIntent) {
  const bookingId = Number(paymentIntent.metadata?.bookingId);
  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    console.error(
      `Stripe webhook: payment intent ${paymentIntent.id} has no usable booking id in its metadata`,
    );
    return null;
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true },
  });
  if (!booking) {
    console.error(`Stripe webhook: booking ${bookingId} does not exist`);
  }
  return booking;
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
