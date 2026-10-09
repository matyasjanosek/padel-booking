import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import Stripe from "stripe";

vi.mock("../src/services/stripeWebhook.js", () => ({
  handleStripeEvent: vi.fn(),
}));

import { createApp } from "../src/app.js";
import { handleStripeEvent } from "../src/services/stripeWebhook.js";

// A real secret and a real Stripe SDK signing/verifying round trip, no
// network call and no API key involved, this is pure local HMAC, the thing
// actually worth proving here is that a tampered or wrongly signed request
// is rejected rather than just trusting whatever the route is given.
const WEBHOOK_SECRET = "whsec_test_secret";

let server;
let baseUrl;

beforeAll(async () => {
  process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
  // getStripe() needs some value here to construct its client at all; the
  // signature check itself is pure local HMAC and never calls out to
  // Stripe, so this key is never actually used to authenticate anything.
  process.env.STRIPE_SECRET_KEY ??= "sk_test_unused";
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://localhost:${server.address().port}`;
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  vi.clearAllMocks();
});

function signedPayload(secret = WEBHOOK_SECRET) {
  const payload = JSON.stringify({
    id: "evt_1",
    type: "payment_intent.succeeded",
    data: { object: { id: "pi_1", metadata: { bookingId: "1" } } },
  });
  const header = Stripe.webhooks.generateTestHeaderString({ payload, secret });
  return { payload, header };
}

function postWebhook(payload, signature) {
  return fetch(`${baseUrl}/api/stripe/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "stripe-signature": signature },
    body: payload,
  });
}

describe("POST /api/stripe/webhook", () => {
  it("accepts a genuinely signed event and hands it to the service", async () => {
    const { payload, header } = signedPayload();

    const res = await postWebhook(payload, header);

    expect(res.status).toBe(200);
    expect(handleStripeEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: "payment_intent.succeeded" }),
    );
  });

  it("rejects a request signed with the wrong secret", async () => {
    const { payload, header } = signedPayload("whsec_wrong_secret");

    const res = await postWebhook(payload, header);

    expect(res.status).toBe(400);
    expect(handleStripeEvent).not.toHaveBeenCalled();
  });

  it("rejects a payload that was tampered with after signing", async () => {
    const { payload, header } = signedPayload();
    const tampered = payload.replace('"bookingId":"1"', '"bookingId":"2"');

    const res = await postWebhook(tampered, header);

    expect(res.status).toBe(400);
    expect(handleStripeEvent).not.toHaveBeenCalled();
  });

  it("rejects a request with no signature header at all", async () => {
    const { payload } = signedPayload();

    const res = await fetch(`${baseUrl}/api/stripe/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });

    expect(res.status).toBe(400);
    expect(handleStripeEvent).not.toHaveBeenCalled();
  });

  it("returns 500 without acknowledging when the service throws", async () => {
    handleStripeEvent.mockRejectedValue(new Error("database is down"));
    const { payload, header } = signedPayload();

    const res = await postWebhook(payload, header);

    expect(res.status).toBe(500);
  });
});
