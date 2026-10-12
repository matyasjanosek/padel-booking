import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { validateCreateCoupon } from "../middleware/validateAdminCoupons.js";
import { listCoupons, createCoupon, setCouponActive } from "../services/coupons.js";

export const adminCouponsRouter = Router();

adminCouponsRouter.get("/admin/coupons", requireAuth, requireAdmin, async (req, res) => {
  try {
    const coupons = await listCoupons();
    res.json(coupons);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not load coupons" });
  }
});

adminCouponsRouter.post(
  "/admin/coupons",
  requireAuth,
  requireAdmin,
  validateCreateCoupon,
  async (req, res) => {
    try {
      const coupon = await createCoupon(req.body);
      res.status(201).json(coupon);
    } catch (error) {
      if (error.code === "P2002") {
        return res.status(409).json({ error: "A coupon with that code already exists" });
      }
      console.error(error);
      res.status(500).json({ error: "Could not create the coupon" });
    }
  },
);

async function setActive(req, res, isActive) {
  const couponId = Number(req.params.id);
  if (!Number.isInteger(couponId) || couponId <= 0) {
    return res.status(400).json({ error: "Invalid coupon id" });
  }
  try {
    const result = await setCouponActive(couponId, isActive);
    if (result.outcome === "not_found") {
      return res.status(404).json({ error: "Coupon not found" });
    }
    res.json(result.coupon);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not update the coupon" });
  }
}

adminCouponsRouter.post("/admin/coupons/:id/activate", requireAuth, requireAdmin, (req, res) =>
  setActive(req, res, true),
);
adminCouponsRouter.post("/admin/coupons/:id/deactivate", requireAuth, requireAdmin, (req, res) =>
  setActive(req, res, false),
);
