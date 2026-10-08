import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { validateCreateBooking } from "../middleware/validateBooking.js";
import { createBooking, toPublicBooking } from "../services/bookings.js";

export const bookingsRouter = Router();

bookingsRouter.post("/bookings", requireAuth, validateCreateBooking, async (req, res) => {
  const { courtId, startTime } = req.body;

  try {
    const booking = await createBooking({ userId: req.user.id, courtId, startTime });
    res.status(201).json(toPublicBooking(booking));
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: "That slot was just taken. Pick another one." });
    }
    if (error.code === "P2003") {
      return res.status(404).json({ error: "Court not found" });
    }
    console.error(error);
    res.status(500).json({ error: "Could not create the booking" });
  }
});
