import express from "express";
import { healthRouter } from "./routes/health.js";
import { courtsRouter } from "./routes/courts.js";

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", healthRouter);
  app.use("/api", courtsRouter);
  return app;
}
