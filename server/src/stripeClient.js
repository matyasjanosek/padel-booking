import Stripe from "stripe";

// Built lazily, not at import time. Stripe's constructor throws if the key
// is missing, and this module is imported through app.js by most of the
// route test suite, not only the payment tests, so constructing it eagerly
// would require every unrelated test to configure a Stripe key too. Tests
// that exercise payments mock this module instead of touching the real
// Stripe API, so the real constructor never runs during tests.
let client;

export function getStripe() {
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return client;
}
