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

// The client's built files, one directory up from server/. In production
// this is the Vite build, created by "npm run build" at the repo root
// before the server starts. In development the client is served by Vite's
// own dev server instead, so this directory does not exist and the static
// middleware below simply finds nothing to serve, harmlessly.
const CLIENT_DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../client/dist");

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
  app.use("/api", tournamentsRouter);
  app.use("/api", adminBookingsRouter);
  app.use("/api", adminCourtsRouter);
  app.use("/api", adminUsersRouter);
  app.use("/api", adminCouponsRouter);

  // Everything that is not an API call is the client's single page app:
  // real static files first (JS, CSS, images), then index.html for any
  // other path, so React Router's own routes work on a hard refresh too.
  // An unmatched /api/* path still falls through to Express's own 404
  // instead of getting index.html.
  app.use(express.static(CLIENT_DIST));
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) {
      return next();
    }
    res.sendFile(path.join(CLIENT_DIST, "index.html"));
  });

  return app;
}
