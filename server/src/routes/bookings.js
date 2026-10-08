import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { validateCreateBooking } from "../middleware/validateBooking.js";
import {
  createBooking,
  listBookingsForUser,
  cancelBooking,
  toPublicBooking,
} from "../services/bookings.js";
import { createPaymentIntentForBooking } from "../services/payments.js";

export const bookingsRouter = Router();

bookingsRouter.get("/bookings", requireAuth, async (req, res) => {
  try {
    const bookings = await listBookingsForUser(req.user.id);
    res.json(bookings.map(toPublicBooking));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not load your bookings" });
  }
});

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

bookingsRouter.post("/bookings/:id/cancel", requireAuth, async (req, res) => {
  const bookingId = Number(req.params.id);
  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return res.status(400).json({ error: "Invalid booking id" });
  }

  try {
    const result = await cancelBooking(bookingId, req.user.id);

    if (result.outcome === "not_found") {
      return res.status(404).json({ error: "Booking not found" });
    }
    if (result.outcome === "forbidden") {
      return res.status(403).json({ error: "You can only cancel your own bookings" });
    }
    if (result.outcome === "not_cancellable") {
      return res.status(409).json({ error: "This booking cannot be cancelled" });
    }

    res.json(toPublicBooking(result.booking));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not cancel the booking" });
  }
});

bookingsRouter.post("/bookings/:id/pay", requireAuth, async (req, res) => {
  const bookingId = Number(req.params.id);
  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return res.status(400).json({ error: "Invalid booking id" });
  }

  try {
    const result = await createPaymentIntentForBooking(bookingId, req.user.id);

    if (result.outcome === "not_found") {
      return res.status(404).json({ error: "Booking not found" });
    }
    if (result.outcome === "forbidden") {
      return res.status(403).json({ error: "You can only pay for your own bookings" });
    }
    if (result.outcome === "not_payable") {
      return res.status(409).json({ error: "This booking cannot be paid for" });
    }

    res.json({
      clientSecret: result.clientSecret,
      amount: result.amount,
      currency: result.currency,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not start the payment" });
  }
});
