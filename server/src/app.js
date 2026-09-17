import express from "express";
import { healthRouter } from "./routes/health.js";
import { courtsRouter } from "./routes/courts.js";
import { authRouter } from "./routes/auth.js";
import { availabilityRouter } from "./routes/availability.js";

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", healthRouter);
  app.use("/api", courtsRouter);
  app.use("/api", authRouter);
  app.use("/api", availabilityRouter);
  return app;
}
