import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { validateAdminBookingsQuery } from "../middleware/validateAdminBookings.js";
import { validateRescheduleBooking } from "../middleware/validateBooking.js";
import {
  listBookingsForAdmin,
  rescheduleBooking,
  cancelBookingAsAdmin,
  toAdminBooking,
} from "../services/adminBookings.js";

export const adminBookingsRouter = Router();

adminBookingsRouter.get(
  "/admin/bookings",
  requireAuth,
  requireAdmin,
  validateAdminBookingsQuery,
  async (req, res) => {
    try {
      const bookings = await listBookingsForAdmin(req.query);
      res.json(bookings.map(toAdminBooking));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Could not load the bookings" });
    }
  },
);

adminBookingsRouter.post(
  "/admin/bookings/:id/reschedule",
  requireAuth,
  requireAdmin,
  validateRescheduleBooking,
  async (req, res) => {
    const bookingId = Number(req.params.id);
    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      return res.status(400).json({ error: "Invalid booking id" });
    }

    try {
      const result = await rescheduleBooking(bookingId, req.body);
      if (result.outcome === "not_found") {
        return res.status(404).json({ error: "Booking not found" });
      }
      if (result.outcome === "court_not_found") {
        return res.status(404).json({ error: "Court not found" });
      }
      if (result.outcome === "not_reschedulable") {
        return res.status(409).json({ error: "This booking cannot be rescheduled" });
      }
      if (result.outcome === "would_exceed_closing") {
        return res.status(409).json({ error: "This booking would run past closing time" });
      }
      if (result.outcome === "slot_taken") {
        return res.status(409).json({ error: "That slot is already taken" });
      }
      res.json(toAdminBooking(result.booking));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Could not reschedule the booking" });
    }
  },
);

adminBookingsRouter.post(
  "/admin/bookings/:id/cancel",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const bookingId = Number(req.params.id);
    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      return res.status(400).json({ error: "Invalid booking id" });
    }

    try {
      const result = await cancelBookingAsAdmin(bookingId);
      if (result.outcome === "not_found") {
        return res.status(404).json({ error: "Booking not found" });
      }
      if (result.outcome === "not_cancellable") {
        return res.status(409).json({ error: "This booking cannot be cancelled" });
      }
      res.json(toAdminBooking(result.booking));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Could not cancel the booking" });
    }
  },
);
