import { Router } from "express";
import { validateAvailabilityQuery } from "../middleware/validateAvailability.js";
import { getAvailability } from "../services/availability.js";
import { SLOT_LENGTH_MINUTES, PRICE_PER_SLOT_CZK } from "../config.js";

export const availabilityRouter = Router();

availabilityRouter.get("/availability", validateAvailabilityQuery, async (req, res) => {
  const { date, courtId } = req.query;

  try {
    const slots = await getAvailability(courtId, date);
    if (!slots) {
      return res.status(404).json({ error: "Court not found" });
    }
    // Sent here, not hardcoded on the client, so the price shown before
    // booking always matches what booking creation will actually charge.
    res.json({ date, courtId, slotMinutes: SLOT_LENGTH_MINUTES, price: PRICE_PER_SLOT_CZK, slots });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not load availability" });
  }
});
