import { prisma } from "../db/client.js";
import { getStripe } from "../stripeClient.js";

const PAYABLE_INTENT_STATUSES = [
  "requires_payment_method",
  "requires_confirmation",
  "requires_action",
];

const BLOCKING_INTENT_STATUSES = ["succeeded", "processing"];

export async function createPaymentIntentForBooking(bookingId, userId) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true },
  });

  if (!booking) {
    return { outcome: "not_found" };
  }
  if (booking.userId !== userId) {
    return { outcome: "forbidden" };
  }
  if (booking.status !== "pending") {
    return { outcome: "not_payable" };
  }

  const stripe = getStripe();

  if (booking.payment) {
    const intent = await stripe.paymentIntents.retrieve(booking.payment.stripePaymentIntentId);

    if (PAYABLE_INTENT_STATUSES.includes(intent.status)) {
      return {
        outcome: "created",
        clientSecret: intent.client_secret,
        amount: Number(booking.payment.amount),
        currency: booking.payment.currency,
      };
    }
    if (BLOCKING_INTENT_STATUSES.includes(intent.status)) {
      return { outcome: "in_progress" };
    }

    await stripe.paymentIntents.cancel(booking.payment.stripePaymentIntentId).catch(() => {});
    await prisma.payment.delete({ where: { bookingId: booking.id } });
  }

  const amountCzk = Number(booking.price);
  const stripeAmount = Math.round(amountCzk * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: stripeAmount,
    currency: "czk",
    metadata: { bookingId: String(booking.id) },
  });

  let payment;
  try {
    payment = await prisma.payment.create({
      data: {
        bookingId: booking.id,
        stripePaymentIntentId: paymentIntent.id,
        amount: amountCzk,
        currency: "czk",
        status: "pending",
      },
    });
  } catch (error) {
    if (error.code !== "P2002") {
      throw error;
    }
    await stripe.paymentIntents.cancel(paymentIntent.id).catch(() => {});
    payment = await prisma.payment.findUniqueOrThrow({ where: { bookingId: booking.id } });
  }

  const intent =
    payment.stripePaymentIntentId === paymentIntent.id
      ? paymentIntent
      : await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);

  return {
    outcome: "created",
    clientSecret: intent.client_secret,
    amount: Number(payment.amount),
    currency: payment.currency,
  };
}

export async function releasePaymentIfPending(bookingId) {
  const payment = await prisma.payment.findUnique({ where: { bookingId } });
  if (!payment || payment.status !== "pending") {
    return;
  }
  const stripe = getStripe();
  try {
    await stripe.paymentIntents.cancel(payment.stripePaymentIntentId);
  } catch (error) {
    console.error(
      `Could not cancel Stripe payment intent ${payment.stripePaymentIntentId} for booking ${bookingId}: ${error.message}`,
    );
    return;
  }
  await prisma.payment.delete({ where: { bookingId } });
}
