const DISCOUNT_TYPES = ["percentage", "fixed"];

export function validateCreateCoupon(req, res, next) {
  const { code, discountType, discountValue, validFrom, validUntil, maxUses } = req.body;

  if (typeof code !== "string" || code.trim().length === 0) {
    return res.status(400).json({ error: "Enter a coupon code" });
  }
  if (!DISCOUNT_TYPES.includes(discountType)) {
    return res.status(400).json({ error: "Enter a valid discount type" });
  }

  const discountValueNumber = Number(discountValue);
  if (!(discountValueNumber > 0)) {
    return res.status(400).json({ error: "Enter a discount value greater than 0" });
  }
  if (discountType === "percentage" && discountValueNumber > 100) {
    return res.status(400).json({ error: "A percentage discount cannot be more than 100" });
  }

  const validFromDate = new Date(validFrom);
  const validUntilDate = new Date(validUntil);
  if (Number.isNaN(validFromDate.getTime()) || Number.isNaN(validUntilDate.getTime())) {
    return res.status(400).json({ error: "Enter a valid validity period" });
  }
  if (validFromDate >= validUntilDate) {
    return res.status(400).json({ error: "The validity period must end after it starts" });
  }

  const maxUsesNumber = Number(maxUses);
  if (!Number.isInteger(maxUsesNumber) || maxUsesNumber <= 0) {
    return res.status(400).json({ error: "Enter a valid usage limit" });
  }

  req.body.code = code.trim();
  req.body.discountValue = discountValueNumber;
  req.body.validFrom = validFromDate;
  req.body.validUntil = validUntilDate;
  req.body.maxUses = maxUsesNumber;
  next();
}
