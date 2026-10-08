import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { fetchMyBookings } from "../api/bookings.js";
import { fetchCourts } from "../api/courts.js";
import { createPaymentIntent } from "../api/payments.js";
import { formatSlot } from "../utils/formatSlot.js";

// Card details are entered straight into Stripe's own Payment Element and
// never pass through this app; confirming just hands the elements instance
// to Stripe. Not confirming the booking here on purpose, the webhook in the
// next step is what turns a successful payment into a confirmed booking.
function PayButton() {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    if (!stripe || !elements) {
      return;
    }
    setSubmitting(true);
    setError("");

    // On success the browser is redirected to return_url and this code
    // never runs again. confirmPayment only returns here when something
    // went wrong immediately, for example a declined card.
    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/account` },
    });

    if (confirmError) {
      setError(confirmError.message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex max-w-sm flex-col gap-5">
      <PaymentElement />
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="mt-2 inline-block self-start rounded-full border border-border px-7 py-3 font-medium text-text transition-colors duration-200 hover:border-accent hover:text-accent disabled:opacity-50"
      >
        {submitting ? "Processing..." : "Pay now"}
      </button>
    </form>
  );
}

export default function Checkout() {
  const { id } = useParams();
  const bookingId = Number(id);

  const [courts, setCourts] = useState([]);
  const [booking, setBooking] = useState(null);
  const [checkout, setCheckout] = useState(null); // { clientSecret, publishableKey }
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCourts()
      .then(setCourts)
      .catch(() => {});
    fetchMyBookings()
      .then((bookings) => setBooking(bookings.find((b) => b.id === bookingId) ?? null))
      .catch(() => setError("Your booking could not be loaded."));
  }, [bookingId]);

  useEffect(() => {
    if (!booking || booking.status !== "pending") {
      return;
    }
    createPaymentIntent(bookingId)
      .then(setCheckout)
      .catch((err) => setError(err.message));
  }, [booking, bookingId]);

  // loadStripe injects Stripe's own script tag; calling it again on every
  // render would do that repeatedly, so it only runs again if the key it
  // was given actually changes.
  const stripePromise = useMemo(
    () => (checkout ? loadStripe(checkout.publishableKey) : null),
    [checkout],
  );

  function courtName(courtId) {
    return courts.find((court) => court.id === courtId)?.name ?? `Court ${courtId}`;
  }

  return (
    <section className="px-5 py-12 md:max-w-page md:pl-24 md:pr-10 md:py-16">
      <h1 className="mb-4 text-4xl tracking-tight md:text-5xl">Checkout</h1>

      {error && <p className="max-w-sm text-sm text-danger">{error}</p>}

      {!error && booking === null && <p className="text-text-muted">Loading your booking...</p>}

      {booking && booking.status !== "pending" && (
        <p className="text-text-muted">This booking cannot be paid for.</p>
      )}

      {booking && booking.status === "pending" && (
        <>
          <p className="max-w-sm text-text-muted">
            {courtName(booking.courtId)}, {formatSlot(booking.startTime, booking.endTime)}
          </p>
          <p className="mt-1 font-medium text-text">{booking.price} CZK</p>

          {checkout && stripePromise && (
            <Elements stripe={stripePromise} options={{ clientSecret: checkout.clientSecret }}>
              <PayButton />
            </Elements>
          )}
        </>
      )}

      <p className="mt-6 text-text-muted">
        <Link to="/account" className="text-text hover:text-accent">
          Back to your account
        </Link>
      </p>
    </section>
  );
}
