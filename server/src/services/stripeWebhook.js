import { prisma } from "../db/client.js";
import { generateGateCode } from "./gateCode.js";
import { sendBookingConfirmationEmail } from "./bookingConfirmationEmail.js";
import { scheduleLighting } from "../hardware/index.js";

// Stripe can redeliver the same event more than once, and a booking's
// payment can be released out from under it if its hold expired or it was
// cancelled before Stripe's event arrived (see releasePaymentIfPending).
// Every handler below re-checks the booking and its payment are still in
// the exact state the event expects before changing anything, so a late or
// duplicate event can never confirm, fail or touch a booking it no longer
// belongs to. Every event this ends up doing nothing with is still logged
// with its own id and type, so none of this is silent.
export async function handleStripeEvent(event) {
  if (event.type === "payment_intent.succeeded") {
    await handlePaymentSucceeded(event);
  } else if (event.type === "payment_intent.payment_failed") {
    await handlePaymentFailed(event);
  }
  // Any other event type is acknowledged but otherwise ignored.
}

async function handlePaymentSucceeded(event) {
  const paymentIntent = event.data.object;
  const { booking, bookingId, reason } = await findCurrentPendingPayment(paymentIntent);
  if (!booking) {
    logIgnoredEvent(event, bookingId, reason);
    return;
  }

  // A use is only counted here, once the booking is actually confirmed, not
  // when the coupon code was applied. An abandoned or failed checkout never
  // reaches this point, so it never burns a use.
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
    ...(booking.couponId
      ? [
          prisma.coupon.update({
            where: { id: booking.couponId },
            data: { timesUsed: { increment: 1 } },
          }),
        ]
      : []),
  ]);

  // The simulation is synchronous and in memory, it cannot fail the way a
  // real network call to Resend below can, so there is no error here to
  // guard against. A real hardware integration is a different piece of
  // code with its own failure modes, not a later addition to this one.
  scheduleLighting({
    courtId: confirmedBooking.courtId,
    startTime: confirmedBooking.startTime,
    endTime: confirmedBooking.endTime,
  });

  // The booking is already paid and confirmed at this point. A failed email
  // must not undo that or fail the webhook, Stripe would just retry an
  // event that already succeeded, so only the send itself is best effort,
  // but logged with enough to find and resend by hand afterwards.
  try {
    await sendBookingConfirmationEmail(confirmedBooking);
  } catch (error) {
    console.error(
      `Stripe webhook: confirmation email for booking ${confirmedBooking.id} to ${confirmedBooking.user.email} failed: ${error.message}`,
    );
  }
}

async function handlePaymentFailed(event) {
  const paymentIntent = event.data.object;
  const { booking, bookingId, reason } = await findCurrentPendingPayment(paymentIntent);
  if (!booking) {
    logIgnoredEvent(event, bookingId, reason);
    return;
  }

  await prisma.payment.update({
    where: { bookingId: booking.id },
    data: { status: "failed" },
  });
}

// Looks up the booking this payment intent's metadata names, and checks it
// is still the exact pending payment the event expects: the booking may
// have been reclaimed by a different attempt since this intent was
// created, or already processed by an earlier delivery of the same event.
// Returns the booking when it is safe to act on, or null together with the
// booking id (if one was found) and the exact reason otherwise, for the
// caller to log and ignore: missing metadata, booking not found, status
// mismatch (the booking or the payment is no longer pending) or intent
// mismatch (the booking's payment points at a different intent now).
async function findCurrentPendingPayment(paymentIntent) {
  const bookingId = Number(paymentIntent.metadata?.bookingId);
  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return { booking: null, bookingId: null, reason: "missing metadata" };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true },
  });
  if (!booking) {
    return { booking: null, bookingId, reason: "booking not found" };
  }
  if (booking.status !== "pending") {
    return { booking: null, bookingId, reason: "status mismatch" };
  }
  if (booking.payment?.stripePaymentIntentId !== paymentIntent.id) {
    return { booking: null, bookingId, reason: "intent mismatch" };
  }
  if (booking.payment.status !== "pending") {
    return { booking: null, bookingId, reason: "status mismatch" };
  }

  return { booking };
}

function logIgnoredEvent(event, bookingId, reason) {
  console.error(
    `Stripe webhook ignored: event ${event.id} (${event.type}), booking ${bookingId ?? "unknown"}, reason: ${reason}`,
  );
}
