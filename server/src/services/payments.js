import { prisma } from "../db/client.js";
import { getStripe } from "../stripeClient.js";

// Starts paying for a pending booking. Looks up any existing payment for it
// first, Stripe payment intents are meant to be reused across retries
// rather than recreated, so reloading the checkout page does not create a
// second one for the same booking. Returns which of several outcomes
// applied, the same shape cancelBooking uses, there is more than one reason
// this can fail and the route needs to tell them apart.
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
    return {
      outcome: "created",
      clientSecret: intent.client_secret,
      amount: Number(booking.payment.amount),
      currency: booking.payment.currency,
    };
  }

  // Payment.amount and the API response stay in crowns, matching how
  // Booking.price is already stored and shown. Stripe's own amount is in
  // the currency's minor unit, CZK has two decimal places like most
  // currencies (it is not one of the zero-decimal ones such as JPY), so
  // only the amount sent to Stripe is multiplied by 100.
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
    // A concurrent request for the same booking won the race and already
    // created the payment row. Cancel the intent this request just made so
    // it is not left dangling at Stripe, and use the one that was actually
    // stored.
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
