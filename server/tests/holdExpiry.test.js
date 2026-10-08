import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/db/client.js", () => ({
  prisma: {
    booking: { updateMany: vi.fn() },
  },
}));

import { prisma } from "../src/db/client.js";
import { expireStaleHolds } from "../src/services/holdExpiry.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("expireStaleHolds", () => {
  it("flips pending bookings whose hold is in the past to expired", async () => {
    prisma.booking.updateMany.mockResolvedValue({ count: 3 });

    const count = await expireStaleHolds();

    expect(count).toBe(3);
    expect(prisma.booking.updateMany).toHaveBeenCalledWith({
      where: { status: "pending", holdExpiresAt: { lt: expect.any(Date) } },
      data: { status: "expired" },
    });
  });

  it("never touches a confirmed booking or a pending booking with time left on its hold", async () => {
    prisma.booking.updateMany.mockResolvedValue({ count: 0 });

    await expireStaleHolds();

    const { where } = prisma.booking.updateMany.mock.calls[0][0];
    expect(where.status).toBe("pending");
    expect(where.holdExpiresAt.lt).toBeInstanceOf(Date);
  });
});
