import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/db/client.js", () => ({
  prisma: {
    user: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  },
}));

import { prisma } from "../src/db/client.js";
import { listUsersForAdmin, changeUserRole } from "../src/services/adminUsers.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listUsersForAdmin", () => {
  it("asks for id, email, name, role and created at, never the password hash", async () => {
    prisma.user.findMany.mockResolvedValue([]);

    await listUsersForAdmin();

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { id: "asc" },
    });
  });
});

describe("changeUserRole", () => {
  it("refuses to let an admin remove their own admin role, without a database read", async () => {
    const result = await changeUserRole(5, "member", 5);

    expect(result).toEqual({ outcome: "cannot_remove_own_admin" });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("allows an admin to set their own role to admin, a no-op", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 5, role: "admin" });
    const updated = { id: 5, email: "a@example.com", name: "Alex", role: "admin" };
    prisma.user.update.mockResolvedValue(updated);

    const result = await changeUserRole(5, "admin", 5);

    expect(result).toEqual({ outcome: "updated", user: updated });
  });

  it("returns not_found for a user that does not exist", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await changeUserRole(99, "admin", 5);

    expect(result).toEqual({ outcome: "not_found" });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("changes another user's role", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 7, role: "member" });
    const updated = { id: 7, email: "b@example.com", name: "Sam", role: "admin" };
    prisma.user.update.mockResolvedValue(updated);

    const result = await changeUserRole(7, "admin", 5);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { role: "admin" },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    expect(result).toEqual({ outcome: "updated", user: updated });
  });
});
