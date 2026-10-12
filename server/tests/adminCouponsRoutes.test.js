import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

vi.mock("../src/services/coupons.js", () => ({
  listCoupons: vi.fn(),
  createCoupon: vi.fn(),
  setCouponActive: vi.fn(),
}));

vi.mock("../src/services/session.js", () => ({
  readSessionUserId: vi.fn(),
}));
vi.mock("../src/services/auth.js", () => ({
  getUserById: vi.fn(),
}));

import { createApp } from "../src/app.js";
import { listCoupons, createCoupon, setCouponActive } from "../src/services/coupons.js";
import { readSessionUserId } from "../src/services/session.js";
import { getUserById } from "../src/services/auth.js";

let server;
let baseUrl;

beforeAll(async () => {
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://localhost:${server.address().port}`;
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  vi.clearAllMocks();
  readSessionUserId.mockReturnValue(1);
  getUserById.mockResolvedValue({ id: 1, role: "admin" });
});

const VALID_BODY = {
  code: "SUMMER10",
  discountType: "percentage",
  discountValue: 10,
  validFrom: "2030-01-01T00:00:00.000Z",
  validUntil: "2030-12-31T00:00:00.000Z",
  maxUses: 50,
};

describe("GET /api/admin/coupons", () => {
  it("returns 401 when not logged in", async () => {
    readSessionUserId.mockReturnValue(null);

    const res = await fetch(`${baseUrl}/api/admin/coupons`);

    expect(res.status).toBe(401);
    expect(listCoupons).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-admin", async () => {
    getUserById.mockResolvedValue({ id: 1, role: "member" });

    const res = await fetch(`${baseUrl}/api/admin/coupons`, { headers: { Cookie: "session=x" } });

    expect(res.status).toBe(403);
    expect(listCoupons).not.toHaveBeenCalled();
  });

  it("returns every coupon", async () => {
    listCoupons.mockResolvedValue([{ id: 1, code: "SUMMER10" }]);

    const res = await fetch(`${baseUrl}/api/admin/coupons`, { headers: { Cookie: "session=x" } });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: 1, code: "SUMMER10" }]);
  });
});

describe("POST /api/admin/coupons", () => {
  function postCreate(body, cookie = "session=x") {
    return fetch(`${baseUrl}/api/admin/coupons`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify(body),
    });
  }

  it("returns 401 when not logged in", async () => {
    readSessionUserId.mockReturnValue(null);

    const res = await postCreate(VALID_BODY, "");

    expect(res.status).toBe(401);
    expect(createCoupon).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-admin", async () => {
    getUserById.mockResolvedValue({ id: 1, role: "member" });

    const res = await postCreate(VALID_BODY);

    expect(res.status).toBe(403);
    expect(createCoupon).not.toHaveBeenCalled();
  });

  it("rejects an invalid body without calling the service", async () => {
    const res = await postCreate({ ...VALID_BODY, discountType: "half-off" });

    expect(res.status).toBe(400);
    expect(createCoupon).not.toHaveBeenCalled();
  });

  it("returns 409 when the code already exists", async () => {
    createCoupon.mockRejectedValue(
      Object.assign(new Error("Unique constraint"), { code: "P2002" }),
    );

    const res = await postCreate(VALID_BODY);

    expect(res.status).toBe(409);
  });

  it("creates the coupon for an admin", async () => {
    createCoupon.mockResolvedValue({ id: 1, code: "SUMMER10" });

    const res = await postCreate(VALID_BODY);

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: 1, code: "SUMMER10" });
    expect(createCoupon).toHaveBeenCalled();
  });
});

describe("POST /api/admin/coupons/:id/activate and /deactivate", () => {
  function postStatus(id, action, cookie = "session=x") {
    return fetch(`${baseUrl}/api/admin/coupons/${id}/${action}`, {
      method: "POST",
      headers: { Cookie: cookie },
    });
  }

  it("returns 401 when not logged in", async () => {
    readSessionUserId.mockReturnValue(null);

    const res = await postStatus(1, "deactivate", "");

    expect(res.status).toBe(401);
    expect(setCouponActive).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-admin", async () => {
    getUserById.mockResolvedValue({ id: 1, role: "member" });

    const res = await postStatus(1, "deactivate");

    expect(res.status).toBe(403);
    expect(setCouponActive).not.toHaveBeenCalled();
  });

  it("returns 404 when the coupon does not exist", async () => {
    setCouponActive.mockResolvedValue({ outcome: "not_found" });

    const res = await postStatus(99, "deactivate");

    expect(res.status).toBe(404);
  });

  it("deactivates the coupon and calls the service with false", async () => {
    setCouponActive.mockResolvedValue({
      outcome: "deactivated",
      coupon: { id: 1, code: "SUMMER10", isActive: false },
    });

    const res = await postStatus(1, "deactivate");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 1, code: "SUMMER10", isActive: false });
    expect(setCouponActive).toHaveBeenCalledWith(1, false);
  });

  it("reactivates the coupon and calls the service with true", async () => {
    setCouponActive.mockResolvedValue({
      outcome: "activated",
      coupon: { id: 1, code: "SUMMER10", isActive: true },
    });

    const res = await postStatus(1, "activate");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 1, code: "SUMMER10", isActive: true });
    expect(setCouponActive).toHaveBeenCalledWith(1, true);
  });
});
