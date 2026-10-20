import { prisma } from "../db/client.js";
import { generateGateCode } from "./gateCode.js";
import { sendBookingConfirmationEmail } from "./bookingConfirmationEmail.js";
import { scheduleLighting } from "../hardware/index.js";

export async function handleStripeEvent(event) {
  if (event.type === "payment_intent.succeeded") {
    await handlePaymentSucceeded(event);
  } else if (event.type === "payment_intent.payment_failed") {
    await handlePaymentFailed(event);
  }
}

async function handlePaymentSucceeded(event) {
  const paymentIntent = event.data.object;
  const { booking, bookingId, reason } = await findCurrentPendingPayment(paymentIntent);
  if (!booking) {
    logIgnoredEvent(event, bookingId, reason);
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
    ...(booking.couponId
      ? [
          prisma.coupon.update({
            where: { id: booking.couponId },
            data: { timesUsed: { increment: 1 } },
          }),
        ]
      : []),
  ]);

  scheduleLighting({
    courtId: confirmedBooking.courtId,
    startTime: confirmedBooking.startTime,
    endTime: confirmedBooking.endTime,
  });

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
