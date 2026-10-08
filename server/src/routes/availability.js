import { Router } from "express";
import { validateAvailabilityQuery } from "../middleware/validateAvailability.js";
import { getAvailability } from "../services/availability.js";
import { SLOT_LENGTH_MINUTES } from "../config.js";

export const availabilityRouter = Router();

availabilityRouter.get("/availability", validateAvailabilityQuery, async (req, res) => {
  const { date, courtId } = req.query;

  try {
    const slots = await getAvailability(courtId, date);
    if (!slots) {
      return res.status(404).json({ error: "Court not found" });
    }
    res.json({ date, courtId, slotMinutes: SLOT_LENGTH_MINUTES, slots });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not load availability" });
  }
});
