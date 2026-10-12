import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

vi.mock("../src/services/adminBookings.js", () => ({
  listBookingsForAdmin: vi.fn(),
  rescheduleBooking: vi.fn(),
  cancelBookingAsAdmin: vi.fn(),
  toAdminBooking: (booking) => ({ id: booking.id, status: booking.status }),
}));

// requireAuth is real middleware; these are the two services it calls, so a
// logged in admin or member can be simulated without real session cookies.
vi.mock("../src/services/session.js", () => ({
  readSessionUserId: vi.fn(),
}));
vi.mock("../src/services/auth.js", () => ({
  getUserById: vi.fn(),
}));

import { createApp } from "../src/app.js";
import {
  listBookingsForAdmin,
  rescheduleBooking,
  cancelBookingAsAdmin,
} from "../src/services/adminBookings.js";
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

describe("GET /api/admin/bookings", () => {
  function getBookings(query = "", cookie = "session=whatever") {
    return fetch(`${baseUrl}/api/admin/bookings${query}`, { headers: { Cookie: cookie } });
  }

  it("returns 401 when not logged in", async () => {
    readSessionUserId.mockReturnValue(null);

    const res = await getBookings("", "");

    expect(res.status).toBe(401);
    expect(listBookingsForAdmin).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-admin", async () => {
    getUserById.mockResolvedValue({ id: 1, role: "member" });

    const res = await getBookings();

    expect(res.status).toBe(403);
    expect(listBookingsForAdmin).not.toHaveBeenCalled();
  });

  it("rejects an invalid filter without calling the service", async () => {
    const res = await getBookings("?status=finished");

    expect(res.status).toBe(400);
    expect(listBookingsForAdmin).not.toHaveBeenCalled();
  });

  it("returns the bookings for an admin", async () => {
    listBookingsForAdmin.mockResolvedValue([{ id: 1, status: "confirmed" }]);

    const res = await getBookings("?status=confirmed");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: 1, status: "confirmed" }]);
    expect(listBookingsForAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ status: "confirmed" }),
    );
  });
});

describe("POST /api/admin/bookings/:id/reschedule", () => {
  const validBody = { courtId: 1, startTime: "2030-06-10T09:00:00.000+02:00" };

  function postReschedule(id, body, cookie = "session=whatever") {
    return fetch(`${baseUrl}/api/admin/bookings/${id}/reschedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify(body),
    });
  }

  it("returns 401 when not logged in", async () => {
    readSessionUserId.mockReturnValue(null);

    const res = await postReschedule(1, validBody, "");

    expect(res.status).toBe(401);
    expect(rescheduleBooking).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-admin", async () => {
    getUserById.mockResolvedValue({ id: 1, role: "member" });

    const res = await postReschedule(1, validBody);

    expect(res.status).toBe(403);
    expect(rescheduleBooking).not.toHaveBeenCalled();
  });

  it("rejects an invalid body without calling the service", async () => {
    const res = await postReschedule(1, { courtId: 1, startTime: "not a date" });

    expect(res.status).toBe(400);
    expect(rescheduleBooking).not.toHaveBeenCalled();
  });

  it("returns 404 when the booking does not exist", async () => {
    rescheduleBooking.mockResolvedValue({ outcome: "not_found" });

    const res = await postReschedule(99, validBody);

    expect(res.status).toBe(404);
  });

  it("returns 404 when the target court does not exist", async () => {
    rescheduleBooking.mockResolvedValue({ outcome: "court_not_found" });

    const res = await postReschedule(1, validBody);

    expect(res.status).toBe(404);
  });

  it("returns 409 when the booking cannot be rescheduled", async () => {
    rescheduleBooking.mockResolvedValue({ outcome: "not_reschedulable" });

    const res = await postReschedule(1, validBody);

    expect(res.status).toBe(409);
  });

  it("returns 409 when the target slot is taken", async () => {
    rescheduleBooking.mockResolvedValue({ outcome: "slot_taken" });

    const res = await postReschedule(1, validBody);

    expect(res.status).toBe(409);
  });

  it("reschedules the booking for an admin", async () => {
    rescheduleBooking.mockResolvedValue({
      outcome: "rescheduled",
      booking: { id: 1, status: "confirmed" },
    });

    const res = await postReschedule(1, validBody);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 1, status: "confirmed" });
    expect(rescheduleBooking).toHaveBeenCalledWith(1, {
      courtId: 1,
      startTime: new Date(validBody.startTime),
    });
  });
});

describe("POST /api/admin/bookings/:id/cancel", () => {
  function postCancel(id, cookie = "session=whatever") {
    return fetch(`${baseUrl}/api/admin/bookings/${id}/cancel`, {
      method: "POST",
      headers: { Cookie: cookie },
    });
  }

  it("returns 401 when not logged in", async () => {
    readSessionUserId.mockReturnValue(null);

    const res = await postCancel(1, "");

    expect(res.status).toBe(401);
    expect(cancelBookingAsAdmin).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-admin", async () => {
    getUserById.mockResolvedValue({ id: 1, role: "member" });

    const res = await postCancel(1);

    expect(res.status).toBe(403);
    expect(cancelBookingAsAdmin).not.toHaveBeenCalled();
  });

  it("returns 404 when the booking does not exist", async () => {
    cancelBookingAsAdmin.mockResolvedValue({ outcome: "not_found" });

    const res = await postCancel(99);

    expect(res.status).toBe(404);
  });

  it("returns 409 when the booking cannot be cancelled", async () => {
    cancelBookingAsAdmin.mockResolvedValue({ outcome: "not_cancellable" });

    const res = await postCancel(1);

    expect(res.status).toBe(409);
  });

  it("cancels the booking for an admin, any booking, not just their own", async () => {
    cancelBookingAsAdmin.mockResolvedValue({
      outcome: "cancelled",
      booking: { id: 1, status: "cancelled" },
    });

    const res = await postCancel(1);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 1, status: "cancelled" });
    expect(cancelBookingAsAdmin).toHaveBeenCalledWith(1);
  });
});
