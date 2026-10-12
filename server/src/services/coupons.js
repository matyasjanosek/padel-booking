import { prisma } from "../db/client.js";

// Coupon codes are stored and compared uppercase, so SUMMER10 and summer10
// are the same coupon, a typo in case should not matter.
function normalizeCode(code) {
  return code.trim().toUpperCase();
}

export function listCoupons() {
  return prisma.coupon.findMany({ orderBy: { id: "asc" } });
}

export function createCoupon({
  code,
  discountType,
  discountValue,
  validFrom,
  validUntil,
  maxUses,
}) {
  return prisma.coupon.create({
    data: {
      code: normalizeCode(code),
      discountType,
      discountValue,
      validFrom,
      validUntil,
      maxUses,
    },
  });
}

export async function setCouponActive(id, isActive) {
  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) {
    return { outcome: "not_found" };
  }
  const updated = await prisma.coupon.update({ where: { id }, data: { isActive } });
  return { outcome: isActive ? "activated" : "deactivated", coupon: updated };
}

// Checked whenever a coupon code is applied to a new booking. Does not
// touch timesUsed, a use is only counted once the booking is actually
// confirmed, see handlePaymentSucceeded in stripeWebhook.js.
export async function validateCoupon(code) {
  const coupon = await prisma.coupon.findUnique({ where: { code: normalizeCode(code) } });
  if (!coupon) {
    return { outcome: "not_found" };
  }
  if (!coupon.isActive) {
    return { outcome: "inactive" };
  }
  const now = new Date();
  if (now < coupon.validFrom) {
    return { outcome: "not_yet_valid" };
  }
  if (now > coupon.validUntil) {
    return { outcome: "expired" };
  }
  if (coupon.timesUsed >= coupon.maxUses) {
    return { outcome: "usage_limit_reached" };
  }
  return { outcome: "valid", coupon };
}

export const COUPON_ERROR_MESSAGES = {
  not_found: "This coupon code does not exist.",
  inactive: "This coupon is no longer active.",
  not_yet_valid: "This coupon is not valid yet.",
  expired: "This coupon has expired.",
  usage_limit_reached: "This coupon has reached its usage limit.",
};

// Price and discountValue are both decimals in crowns. The result is never
// negative, a fixed discount larger than the price just makes the slot free.
export function applyDiscount(price, coupon) {
  const value = Number(coupon.discountValue);
  const discounted =
    coupon.discountType === "percentage" ? price * (1 - value / 100) : price - value;
  return Math.max(0, Math.round(discounted * 100) / 100);
}
