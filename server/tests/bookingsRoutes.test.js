import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

vi.mock("../src/services/bookings.js", () => ({
  createBooking: vi.fn(),
  listBookingsForUser: vi.fn(),
  cancelBooking: vi.fn(),
  toPublicBooking: (booking) => ({ id: booking.id, status: booking.status ?? "pending" }),
}));

vi.mock("../src/services/payments.js", () => ({
  createPaymentIntentForBooking: vi.fn(),
}));

// requireAuth is real middleware; these are the two services it calls, so a
// logged in user can be simulated without real session cookies.
vi.mock("../src/services/session.js", () => ({
  readSessionUserId: vi.fn(),
}));
vi.mock("../src/services/auth.js", () => ({
  getUserById: vi.fn(),
}));

import { createApp } from "../src/app.js";
import { createBooking, listBookingsForUser, cancelBooking } from "../src/services/bookings.js";
import { createPaymentIntentForBooking } from "../src/services/payments.js";
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
  getUserById.mockResolvedValue({ id: 1, role: "member" });
});

// 09:00 on this date is a real slot start and always in the future.
const VALID_START = "2030-06-10T09:00:00.000+02:00";

function postBooking(body, cookie = "session=whatever") {
  return fetch(`${baseUrl}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(body),
  });
}

describe("POST /api/bookings", () => {
  it("returns 401 when not logged in", async () => {
    readSessionUserId.mockReturnValue(null);

    const res = await postBooking({ courtId: 1, startTime: VALID_START }, "");

    expect(res.status).toBe(401);
    expect(createBooking).not.toHaveBeenCalled();
  });

  it("creates the booking for the logged in user", async () => {
    createBooking.mockResolvedValue({ id: 42 });

    const res = await postBooking({ courtId: 1, startTime: VALID_START });

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: 42, status: "pending" });
    expect(createBooking).toHaveBeenCalledWith({
      userId: 1,
      courtId: 1,
      startTime: new Date(VALID_START),
    });
  });

  it("rejects an invalid request without calling the service", async () => {
    const res = await postBooking({ courtId: 1, startTime: "not a date" });

    expect(res.status).toBe(400);
    expect(createBooking).not.toHaveBeenCalled();
  });

  it("returns 409 when the slot was just taken", async () => {
    createBooking.mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" }),
    );

    const res = await postBooking({ courtId: 1, startTime: VALID_START });

    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/just taken/i);
  });

  it("returns 404 when the court does not exist", async () => {
    createBooking.mockRejectedValue(
      Object.assign(new Error("Foreign key constraint failed"), { code: "P2003" }),
    );

    const res = await postBooking({ courtId: 999, startTime: VALID_START });

    expect(res.status).toBe(404);
  });
});

describe("GET /api/bookings", () => {
  it("returns 401 when not logged in", async () => {
    readSessionUserId.mockReturnValue(null);

    const res = await fetch(`${baseUrl}/api/bookings`);

    expect(res.status).toBe(401);
    expect(listBookingsForUser).not.toHaveBeenCalled();
  });

  it("returns the logged in user's own bookings", async () => {
    listBookingsForUser.mockResolvedValue([
      { id: 1, status: "pending" },
      { id: 2, status: "cancelled" },
    ]);

    const res = await fetch(`${baseUrl}/api/bookings`, { headers: { Cookie: "session=whatever" } });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([
      { id: 1, status: "pending" },
      { id: 2, status: "cancelled" },
    ]);
    expect(listBookingsForUser).toHaveBeenCalledWith(1);
  });
});

describe("POST /api/bookings/:id/cancel", () => {
  function postCancel(id, cookie = "session=whatever") {
    return fetch(`${baseUrl}/api/bookings/${id}/cancel`, {
      method: "POST",
      headers: { Cookie: cookie },
    });
  }

  it("returns 401 when not logged in", async () => {
    readSessionUserId.mockReturnValue(null);

    const res = await postCancel(1, "");

    expect(res.status).toBe(401);
    expect(cancelBooking).not.toHaveBeenCalled();
  });

  it("rejects a non-numeric id without calling the service", async () => {
    const res = await postCancel("not-a-number");

    expect(res.status).toBe(400);
    expect(cancelBooking).not.toHaveBeenCalled();
  });

  it("returns 404 when the booking does not exist", async () => {
    cancelBooking.mockResolvedValue({ outcome: "not_found" });

    const res = await postCancel(999);

    expect(res.status).toBe(404);
  });

  it("returns 403 when the booking belongs to someone else", async () => {
    cancelBooking.mockResolvedValue({ outcome: "forbidden" });

    const res = await postCancel(1);

    expect(res.status).toBe(403);
  });

  it("returns 409 when the booking can no longer be cancelled", async () => {
    cancelBooking.mockResolvedValue({ outcome: "not_cancellable" });

    const res = await postCancel(1);

    expect(res.status).toBe(409);
  });

  it("cancels the booking and passes the right id and the logged in user's id", async () => {
    cancelBooking.mockResolvedValue({
      outcome: "cancelled",
      booking: { id: 1, status: "cancelled" },
    });

    const res = await postCancel(1);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 1, status: "cancelled" });
    expect(cancelBooking).toHaveBeenCalledWith(1, 1);
  });
});

describe("POST /api/bookings/:id/pay", () => {
  function postPay(id, cookie = "session=whatever") {
    return fetch(`${baseUrl}/api/bookings/${id}/pay`, {
      method: "POST",
      headers: { Cookie: cookie },
    });
  }

  it("returns 401 when not logged in", async () => {
    readSessionUserId.mockReturnValue(null);

    const res = await postPay(1, "");

    expect(res.status).toBe(401);
    expect(createPaymentIntentForBooking).not.toHaveBeenCalled();
  });

  it("rejects a non-numeric id without calling the service", async () => {
    const res = await postPay("not-a-number");

    expect(res.status).toBe(400);
    expect(createPaymentIntentForBooking).not.toHaveBeenCalled();
  });

  it("returns 404 when the booking does not exist", async () => {
    createPaymentIntentForBooking.mockResolvedValue({ outcome: "not_found" });

    const res = await postPay(999);

    expect(res.status).toBe(404);
  });

  it("returns 403 when the booking belongs to someone else", async () => {
    createPaymentIntentForBooking.mockResolvedValue({ outcome: "forbidden" });

    const res = await postPay(1);

    expect(res.status).toBe(403);
  });

  it("returns 409 when the booking cannot be paid for", async () => {
    createPaymentIntentForBooking.mockResolvedValue({ outcome: "not_payable" });

    const res = await postPay(1);

    expect(res.status).toBe(409);
  });

  it("returns the client secret, the amount, the currency and the publishable key", async () => {
    process.env.STRIPE_PUBLISHABLE_KEY = "pk_test_example";
    createPaymentIntentForBooking.mockResolvedValue({
      outcome: "created",
      clientSecret: "pi_1_secret",
      amount: 400,
      currency: "czk",
    });

    const res = await postPay(1);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      clientSecret: "pi_1_secret",
      amount: 400,
      currency: "czk",
      publishableKey: "pk_test_example",
    });
    expect(createPaymentIntentForBooking).toHaveBeenCalledWith(1, 1);
  });
});
