import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { validateRenameCourt } from "../middleware/validateAdminCourts.js";
import { listCourts, renameCourt, setCourtActive } from "../services/courts.js";

export const adminCourtsRouter = Router();

adminCourtsRouter.get("/admin/courts", requireAuth, requireAdmin, async (req, res) => {
  try {
    const courts = await listCourts();
    res.json(courts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not load courts" });
  }
});

adminCourtsRouter.post(
  "/admin/courts/:id/rename",
  requireAuth,
  requireAdmin,
  validateRenameCourt,
  async (req, res) => {
    const courtId = Number(req.params.id);
    if (!Number.isInteger(courtId) || courtId <= 0) {
      return res.status(400).json({ error: "Invalid court id" });
    }

    try {
      const result = await renameCourt(courtId, req.body.name);
      if (result.outcome === "not_found") {
        return res.status(404).json({ error: "Court not found" });
      }
      res.json(result.court);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Could not rename the court" });
    }
  },
);

async function setActive(req, res, isActive) {
  const courtId = Number(req.params.id);
  if (!Number.isInteger(courtId) || courtId <= 0) {
    return res.status(400).json({ error: "Invalid court id" });
  }

  try {
    const result = await setCourtActive(courtId, isActive);
    if (result.outcome === "not_found") {
      return res.status(404).json({ error: "Court not found" });
    }
    res.json({
      court: result.court,
      futureConfirmedBookings: result.futureConfirmedBookings ?? 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not update the court" });
  }
}

adminCourtsRouter.post("/admin/courts/:id/activate", requireAuth, requireAdmin, (req, res) =>
  setActive(req, res, true),
);
adminCourtsRouter.post("/admin/courts/:id/deactivate", requireAuth, requireAdmin, (req, res) =>
  setActive(req, res, false),
);
