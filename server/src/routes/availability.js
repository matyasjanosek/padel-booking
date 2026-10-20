import { Router } from "express";
import { validateAvailabilityQuery } from "../middleware/validateAvailability.js";
import { getAvailability } from "../services/availability.js";
import { UNIT_LENGTH_MINUTES, PRICE_PER_HOUR_CZK } from "../config.js";

export const availabilityRouter = Router();

availabilityRouter.get("/availability", validateAvailabilityQuery, async (req, res) => {
  const { date, courtId } = req.query;

  try {
    const slots = await getAvailability(courtId, date);
    if (!slots) {
      return res.status(404).json({ error: "Court not found" });
    }
    res.json({
      date,
      courtId,
      unitMinutes: UNIT_LENGTH_MINUTES,
      pricePerHour: PRICE_PER_HOUR_CZK,
      slots,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not load availability" });
  }
});
