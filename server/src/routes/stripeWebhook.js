import express, { Router } from "express";
import { getStripe } from "../stripeClient.js";
import { handleStripeEvent } from "../services/stripeWebhook.js";

export const stripeWebhookRouter = Router();

// Stripe signs the exact raw request body, so this route needs it
// unparsed, raw() here instead of the app-wide express.json(); app.js
// mounts this router before that global parser for the same reason.
stripeWebhookRouter.post(
  "/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    let event;
    try {
      event = getStripe().webhooks.constructEvent(
        req.body,
        req.headers["stripe-signature"],
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (error) {
      console.error("Stripe webhook signature check failed:", error.message);
      return res.status(400).send("Invalid signature");
    }

    try {
      await handleStripeEvent(event);
      res.sendStatus(200);
    } catch (error) {
      console.error(error);
      res.sendStatus(500);
    }
  },
);
