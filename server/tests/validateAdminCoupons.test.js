import { describe, it, expect, vi } from "vitest";
import { validateCreateCoupon } from "../src/middleware/validateAdminCoupons.js";

function fakeResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

const VALID_BODY = {
  code: "summer10",
  discountType: "percentage",
  discountValue: "10",
  validFrom: "2030-01-01T00:00:00.000Z",
  validUntil: "2030-12-31T00:00:00.000Z",
  maxUses: "50",
};

describe("validateCreateCoupon", () => {
  it("normalises the fields and calls next for a valid request", () => {
    const req = { body: { ...VALID_BODY } };
    const next = vi.fn();

    validateCreateCoupon(req, fakeResponse(), next);

    expect(next).toHaveBeenCalled();
    expect(req.body.code).toBe("summer10");
    expect(req.body.discountValue).toBe(10);
    expect(req.body.maxUses).toBe(50);
    expect(req.body.validFrom).toBeInstanceOf(Date);
    expect(req.body.validUntil).toBeInstanceOf(Date);
  });

  it("rejects a missing code", () => {
    const req = { body: { ...VALID_BODY, code: "  " } };
    const res = fakeResponse();
    validateCreateCoupon(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });

  it("rejects an invalid discount type", () => {
    const req = { body: { ...VALID_BODY, discountType: "half-off" } };
    const res = fakeResponse();
    validateCreateCoupon(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });

  it("rejects a discount value that is not greater than 0", () => {
    const req = { body: { ...VALID_BODY, discountValue: "0" } };
    const res = fakeResponse();
    validateCreateCoupon(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });

  it("rejects a percentage discount over 100", () => {
    const req = { body: { ...VALID_BODY, discountType: "percentage", discountValue: "101" } };
    const res = fakeResponse();
    validateCreateCoupon(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });

  it("allows a fixed discount over 100", () => {
    const req = { body: { ...VALID_BODY, discountType: "fixed", discountValue: "500" } };
    const next = vi.fn();
    validateCreateCoupon(req, fakeResponse(), next);
    expect(next).toHaveBeenCalled();
  });

  it("rejects a validity period that ends before it starts", () => {
    const req = {
      body: {
        ...VALID_BODY,
        validFrom: "2030-12-31T00:00:00.000Z",
        validUntil: "2030-01-01T00:00:00.000Z",
      },
    };
    const res = fakeResponse();
    validateCreateCoupon(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });

  it("rejects a usage limit that is not a positive integer", () => {
    const req = { body: { ...VALID_BODY, maxUses: "0" } };
    const res = fakeResponse();
    validateCreateCoupon(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });
});
