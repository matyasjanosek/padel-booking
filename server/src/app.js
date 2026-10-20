import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { healthRouter } from "./routes/health.js";
import { courtsRouter } from "./routes/courts.js";
import { authRouter } from "./routes/auth.js";
import { availabilityRouter } from "./routes/availability.js";
import { bookingsRouter } from "./routes/bookings.js";
import { stripeWebhookRouter } from "./routes/stripeWebhook.js";
import { gateRouter } from "./routes/gate.js";
import { tournamentsRouter } from "./routes/tournaments.js";
import { adminBookingsRouter } from "./routes/adminBookings.js";
import { adminCourtsRouter } from "./routes/adminCourts.js";
import { adminUsersRouter } from "./routes/adminUsers.js";
import { adminCouponsRouter } from "./routes/adminCoupons.js";
import { contactRouter } from "./routes/contact.js";

const CLIENT_DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../client/dist");

export function createApp() {
  const app = express();
  app.use("/api", stripeWebhookRouter);
  app.use(express.json());
  app.use("/api", healthRouter);
  app.use("/api", courtsRouter);
  app.use("/api", authRouter);
  app.use("/api", availabilityRouter);
  app.use("/api", bookingsRouter);
  app.use("/api", gateRouter);
  app.use("/api", tournamentsRouter);
  app.use("/api", adminBookingsRouter);
  app.use("/api", adminCourtsRouter);
  app.use("/api", adminUsersRouter);
  app.use("/api", adminCouponsRouter);
  app.use("/api", contactRouter);

  app.use(express.static(CLIENT_DIST));
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) {
      return next();
    }
    res.sendFile(path.join(CLIENT_DIST, "index.html"));
  });

  return app;
}
