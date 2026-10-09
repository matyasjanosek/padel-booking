import express from "express";
import { healthRouter } from "./routes/health.js";
import { courtsRouter } from "./routes/courts.js";
import { authRouter } from "./routes/auth.js";
import { availabilityRouter } from "./routes/availability.js";
import { bookingsRouter } from "./routes/bookings.js";
import { stripeWebhookRouter } from "./routes/stripeWebhook.js";
import { gateRouter } from "./routes/gate.js";

export function createApp() {
  const app = express();
  // Mounted before express.json(): the webhook route needs the raw body to
  // verify Stripe's signature, and reads it itself, see stripeWebhook.js.
  app.use("/api", stripeWebhookRouter);
  app.use(express.json());
  app.use("/api", healthRouter);
  app.use("/api", courtsRouter);
  app.use("/api", authRouter);
  app.use("/api", availabilityRouter);
  app.use("/api", bookingsRouter);
  app.use("/api", gateRouter);
  return app;
}
