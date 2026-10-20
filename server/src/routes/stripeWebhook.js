import express, { Router } from "express";
import { getStripe } from "../stripeClient.js";
import { handleStripeEvent } from "../services/stripeWebhook.js";

export const stripeWebhookRouter = Router();

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
