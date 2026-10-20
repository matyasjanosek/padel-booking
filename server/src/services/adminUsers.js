import { prisma } from "../db/client.js";

const USER_FIELDS = { id: true, email: true, name: true, role: true, createdAt: true };

export function listUsersForAdmin() {
  return prisma.user.findMany({ select: USER_FIELDS, orderBy: { id: "asc" } });
}

export async function changeUserRole(userId, role, requestingUserId) {
  if (userId === requestingUserId && role !== "admin") {
    return { outcome: "cannot_remove_own_admin" };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { outcome: "not_found" };
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: USER_FIELDS,
  });
  return { outcome: "updated", user: updated };
}
