import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/db/client.js", () => ({
  prisma: {
    court: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    booking: { count: vi.fn() },
  },
}));

import { prisma } from "../src/db/client.js";
import {
  listCourts,
  listActiveCourts,
  renameCourt,
  setCourtActive,
} from "../src/services/courts.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listCourts", () => {
  it("returns every court, including inactive ones", async () => {
    prisma.court.findMany.mockResolvedValue([]);

    await listCourts();

    expect(prisma.court.findMany).toHaveBeenCalledWith({ orderBy: { id: "asc" } });
  });
});

describe("listActiveCourts", () => {
  it("asks for only active courts", async () => {
    prisma.court.findMany.mockResolvedValue([]);

    await listActiveCourts();

    expect(prisma.court.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { id: "asc" },
    });
  });
});

describe("renameCourt", () => {
  it("returns not_found for a court that does not exist", async () => {
    prisma.court.findUnique.mockResolvedValue(null);

    const result = await renameCourt(99, "Court 9");

    expect(result).toEqual({ outcome: "not_found" });
    expect(prisma.court.update).not.toHaveBeenCalled();
  });

  it("renames the court", async () => {
    prisma.court.findUnique.mockResolvedValue({ id: 1, name: "Court 1", isActive: true });
    const renamed = { id: 1, name: "Centre Court", isActive: true };
    prisma.court.update.mockResolvedValue(renamed);

    const result = await renameCourt(1, "Centre Court");

    expect(prisma.court.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { name: "Centre Court" },
    });
    expect(result).toEqual({ outcome: "renamed", court: renamed });
  });
});

describe("setCourtActive", () => {
  it("returns not_found for a court that does not exist", async () => {
    prisma.court.findUnique.mockResolvedValue(null);

    const result = await setCourtActive(99, false);

    expect(result).toEqual({ outcome: "not_found" });
    expect(prisma.court.update).not.toHaveBeenCalled();
  });

  it("activates a court without counting bookings", async () => {
    prisma.court.findUnique.mockResolvedValue({ id: 1, name: "Court 1", isActive: false });
    const activated = { id: 1, name: "Court 1", isActive: true };
    prisma.court.update.mockResolvedValue(activated);

    const result = await setCourtActive(1, true);

    expect(prisma.court.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { isActive: true },
    });
    expect(prisma.booking.count).not.toHaveBeenCalled();
    expect(result).toEqual({ outcome: "activated", court: activated });
  });

  it("deactivates a court and reports how many confirmed bookings it still has in the future", async () => {
    prisma.court.findUnique.mockResolvedValue({ id: 1, name: "Court 1", isActive: true });
    const deactivated = { id: 1, name: "Court 1", isActive: false };
    prisma.court.update.mockResolvedValue(deactivated);
    prisma.booking.count.mockResolvedValue(3);

    const result = await setCourtActive(1, false);

    expect(prisma.booking.count).toHaveBeenCalledWith({
      where: { courtId: 1, status: "confirmed", startTime: { gt: expect.any(Date) } },
    });
    expect(result).toEqual({
      outcome: "deactivated",
      court: deactivated,
      futureConfirmedBookings: 3,
    });
  });
});
