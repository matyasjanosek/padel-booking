import { Router } from "express";
import { listCourts } from "../services/courts.js";

export const courtsRouter = Router();

courtsRouter.get("/courts", async (req, res) => {
  try {
    const courts = await listCourts();
    res.json(courts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not load courts" });
  }
});
