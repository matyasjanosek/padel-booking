import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/db/client.js", () => ({
  prisma: {
    booking: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("../src/services/payments.js", () => ({
  releasePaymentIfPending: vi.fn(),
}));

vi.mock("../src/hardware/index.js", () => ({
  scheduleLighting: vi.fn(),
  cancelLighting: vi.fn(),
}));

function p2002() {
  return Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
}
function p2003() {
  return Object.assign(new Error("Foreign key constraint failed"), { code: "P2003" });
}

import { prisma } from "../src/db/client.js";
import { releasePaymentIfPending } from "../src/services/payments.js";
import { scheduleLighting, cancelLighting } from "../src/hardware/index.js";
import {
  listBookingsForAdmin,
  rescheduleBooking,
  cancelBookingAsAdmin,
  toAdminBooking,
} from "../src/services/adminBookings.js";

function booking(overrides = {}) {
  return {
    id: 1,
    userId: 5,
    courtId: 1,
    startTime: new Date("2030-06-10T07:00:00.000Z"),
    endTime: new Date("2030-06-10T08:00:00.000Z"),
    status: "confirmed",
    price: { toString: () => "400" },
    gateCode: "123456",
    user: { id: 5, name: "Alex", email: "alex@example.com" },
    court: { id: 1, name: "Court 1" },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listBookingsForAdmin", () => {
  it("lists every booking with no filters", async () => {
    prisma.booking.findMany.mockResolvedValue([]);

    await listBookingsForAdmin({});

    expect(prisma.booking.findMany).toHaveBeenCalledWith({
      where: {},
      include: { user: true, court: true },
      orderBy: { startTime: "desc" },
    });
  });

  it("filters by status and court id together", async () => {
    prisma.booking.findMany.mockResolvedValue([]);

    await listBookingsForAdmin({ status: "confirmed", courtId: 2 });

    const { where } = prisma.booking.findMany.mock.calls[0][0];
    expect(where.status).toBe("confirmed");
    expect(where.courtId).toBe(2);
  });

  it("filters by a day within Prague opening hours", async () => {
    prisma.booking.findMany.mockResolvedValue([]);

    await listBookingsForAdmin({ date: "2030-06-10" });

    const { where } = prisma.booking.findMany.mock.calls[0][0];
    expect(where.startTime.gte.toISOString()).toBe("2030-06-10T05:00:00.000Z");
    expect(where.startTime.lt.toISOString()).toBe("2030-06-10T20:00:00.000Z");
  });
});

describe("rescheduleBooking", () => {
  const newCourtId = 2;
  const newStartTime = new Date("2030-06-11T09:00:00.000Z");

  it("returns not_found for a booking that does not exist", async () => {
    prisma.booking.findUnique.mockResolvedValue(null);

    const result = await rescheduleBooking(99, { courtId: newCourtId, startTime: newStartTime });

    expect(result).toEqual({ outcome: "not_found" });
  });

  it.each(["cancelled", "expired"])(
    "returns not_reschedulable for a %s booking",
    async (status) => {
      prisma.booking.findUnique.mockResolvedValue(booking({ status }));

      const result = await rescheduleBooking(1, { courtId: newCourtId, startTime: newStartTime });

      expect(result).toEqual({ outcome: "not_reschedulable" });
      expect(prisma.booking.update).not.toHaveBeenCalled();
    },
  );

  it("returns slot_taken when the target slot is already booked", async () => {
    prisma.booking.findUnique.mockResolvedValue(booking());
    prisma.booking.update.mockRejectedValue(p2002());

    const result = await rescheduleBooking(1, { courtId: newCourtId, startTime: newStartTime });

    expect(result).toEqual({ outcome: "slot_taken" });
  });

  it("returns court_not_found when the target court does not exist", async () => {
    prisma.booking.findUnique.mockResolvedValue(booking());
    prisma.booking.update.mockRejectedValue(p2003());

    const result = await rescheduleBooking(1, { courtId: 999, startTime: newStartTime });

    expect(result).toEqual({ outcome: "court_not_found" });
  });

  it("moves a pending booking without touching lighting, nothing was ever scheduled", async () => {
    prisma.booking.findUnique.mockResolvedValue(booking({ status: "pending" }));
    prisma.booking.update.mockResolvedValue(booking({ status: "pending" }));

    const result = await rescheduleBooking(1, { courtId: newCourtId, startTime: newStartTime });

    expect(result.outcome).toBe("rescheduled");
    expect(cancelLighting).not.toHaveBeenCalled();
    expect(scheduleLighting).not.toHaveBeenCalled();
  });

  it("cancels the old lighting schedule and schedules the new one for a confirmed booking", async () => {
    const existing = booking({ status: "confirmed" });
    prisma.booking.findUnique.mockResolvedValue(existing);
    prisma.booking.update.mockResolvedValue(
      booking({ courtId: newCourtId, startTime: newStartTime }),
    );

    await rescheduleBooking(1, { courtId: newCourtId, startTime: newStartTime });

    expect(cancelLighting).toHaveBeenCalledWith({
      courtId: existing.courtId,
      startTime: existing.startTime,
    });
    expect(scheduleLighting).toHaveBeenCalledWith({
      courtId: newCourtId,
      startTime: newStartTime,
      endTime: new Date(newStartTime.getTime() + 60 * 60 * 1000),
    });
  });
});

describe("cancelBookingAsAdmin", () => {
  it("returns not_found for a booking that does not exist", async () => {
    prisma.booking.findUnique.mockResolvedValue(null);

    const result = await cancelBookingAsAdmin(99);

    expect(result).toEqual({ outcome: "not_found" });
  });

  it.each(["cancelled", "expired"])("returns not_cancellable for a %s booking", async (status) => {
    prisma.booking.findUnique.mockResolvedValue(booking({ status }));

    const result = await cancelBookingAsAdmin(1);

    expect(result).toEqual({ outcome: "not_cancellable" });
  });

  it("cancels a pending booking, releases its payment, and does not touch lighting", async () => {
    prisma.booking.findUnique.mockResolvedValue(booking({ status: "pending" }));
    prisma.booking.update.mockResolvedValue(booking({ status: "cancelled" }));

    const result = await cancelBookingAsAdmin(1);

    expect(result.outcome).toBe("cancelled");
    expect(releasePaymentIfPending).toHaveBeenCalledWith(1);
    expect(cancelLighting).not.toHaveBeenCalled();
  });

  it("cancels a confirmed booking's lighting schedule too", async () => {
    const existing = booking({ status: "confirmed" });
    prisma.booking.findUnique.mockResolvedValue(existing);
    prisma.booking.update.mockResolvedValue(booking({ status: "cancelled" }));

    await cancelBookingAsAdmin(1);

    expect(cancelLighting).toHaveBeenCalledWith({
      courtId: existing.courtId,
      startTime: existing.startTime,
    });
  });
});

describe("toAdminBooking", () => {
  it("includes the user, the court name and the price as a number", () => {
    expect(toAdminBooking(booking())).toEqual({
      id: 1,
      user: { id: 5, name: "Alex", email: "alex@example.com" },
      courtId: 1,
      courtName: "Court 1",
      startTime: "2030-06-10T09:00:00.000+02:00",
      endTime: "2030-06-10T10:00:00.000+02:00",
      status: "confirmed",
      price: 400,
      gateCode: "123456",
    });
  });
});
