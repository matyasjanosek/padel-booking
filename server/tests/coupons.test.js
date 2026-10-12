import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/db/client.js", () => ({
  prisma: {
    coupon: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}));

import { prisma } from "../src/db/client.js";
import {
  listCoupons,
  createCoupon,
  setCouponActive,
  validateCoupon,
  applyDiscount,
} from "../src/services/coupons.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listCoupons", () => {
  it("returns every coupon", async () => {
    prisma.coupon.findMany.mockResolvedValue([]);

    await listCoupons();

    expect(prisma.coupon.findMany).toHaveBeenCalledWith({ orderBy: { id: "asc" } });
  });
});

describe("createCoupon", () => {
  it("stores the code uppercase", async () => {
    prisma.coupon.create.mockResolvedValue({ id: 1 });

    await createCoupon({
      code: "summer10",
      discountType: "percentage",
      discountValue: 10,
      validFrom: new Date("2030-01-01"),
      validUntil: new Date("2030-12-31"),
      maxUses: 50,
    });

    expect(prisma.coupon.create).toHaveBeenCalledWith({
      data: {
        code: "SUMMER10",
        discountType: "percentage",
        discountValue: 10,
        validFrom: new Date("2030-01-01"),
        validUntil: new Date("2030-12-31"),
        maxUses: 50,
      },
    });
  });
});

describe("setCouponActive", () => {
  it("returns not_found for a coupon that does not exist", async () => {
    prisma.coupon.findUnique.mockResolvedValue(null);

    const result = await setCouponActive(99, false);

    expect(result).toEqual({ outcome: "not_found" });
    expect(prisma.coupon.update).not.toHaveBeenCalled();
  });

  it("deactivates an existing coupon", async () => {
    prisma.coupon.findUnique.mockResolvedValue({ id: 1, isActive: true });
    const deactivated = { id: 1, isActive: false };
    prisma.coupon.update.mockResolvedValue(deactivated);

    const result = await setCouponActive(1, false);

    expect(prisma.coupon.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { isActive: false },
    });
    expect(result).toEqual({ outcome: "deactivated", coupon: deactivated });
  });

  it("reactivates an existing coupon", async () => {
    prisma.coupon.findUnique.mockResolvedValue({ id: 1, isActive: false });
    const activated = { id: 1, isActive: true };
    prisma.coupon.update.mockResolvedValue(activated);

    const result = await setCouponActive(1, true);

    expect(prisma.coupon.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { isActive: true },
    });
    expect(result).toEqual({ outcome: "activated", coupon: activated });
  });
});

describe("validateCoupon", () => {
  const now = new Date();
  const base = {
    id: 1,
    code: "SUMMER10",
    discountType: "percentage",
    discountValue: 10,
    isActive: true,
    validFrom: new Date(now.getTime() - 1000),
    validUntil: new Date(now.getTime() + 1000),
    maxUses: 5,
    timesUsed: 0,
  };

  it("looks the code up uppercase", async () => {
    prisma.coupon.findUnique.mockResolvedValue(null);

    await validateCoupon("summer10");

    expect(prisma.coupon.findUnique).toHaveBeenCalledWith({ where: { code: "SUMMER10" } });
  });

  it("returns not_found for an unknown code", async () => {
    prisma.coupon.findUnique.mockResolvedValue(null);

    expect(await validateCoupon("NOPE")).toEqual({ outcome: "not_found" });
  });

  it("returns inactive for a deactivated coupon", async () => {
    prisma.coupon.findUnique.mockResolvedValue({ ...base, isActive: false });

    expect(await validateCoupon("SUMMER10")).toEqual({ outcome: "inactive" });
  });

  it("returns not_yet_valid before its validity period starts", async () => {
    prisma.coupon.findUnique.mockResolvedValue({
      ...base,
      validFrom: new Date(now.getTime() + 1000),
      validUntil: new Date(now.getTime() + 2000),
    });

    expect(await validateCoupon("SUMMER10")).toEqual({ outcome: "not_yet_valid" });
  });

  it("returns expired after its validity period ends", async () => {
    prisma.coupon.findUnique.mockResolvedValue({
      ...base,
      validFrom: new Date(now.getTime() - 2000),
      validUntil: new Date(now.getTime() - 1000),
    });

    expect(await validateCoupon("SUMMER10")).toEqual({ outcome: "expired" });
  });

  it("returns usage_limit_reached once timesUsed reaches maxUses", async () => {
    prisma.coupon.findUnique.mockResolvedValue({ ...base, maxUses: 3, timesUsed: 3 });

    expect(await validateCoupon("SUMMER10")).toEqual({ outcome: "usage_limit_reached" });
  });

  it("returns valid with the coupon when every check passes", async () => {
    prisma.coupon.findUnique.mockResolvedValue(base);

    expect(await validateCoupon("SUMMER10")).toEqual({ outcome: "valid", coupon: base });
  });
});

describe("applyDiscount", () => {
  it("applies a percentage discount", () => {
    expect(applyDiscount(400, { discountType: "percentage", discountValue: 10 })).toBe(360);
  });

  it("applies a fixed discount", () => {
    expect(applyDiscount(400, { discountType: "fixed", discountValue: 150 })).toBe(250);
  });

  it("never goes below 0 when a fixed discount is larger than the price", () => {
    expect(applyDiscount(400, { discountType: "fixed", discountValue: 1000 })).toBe(0);
  });
});
