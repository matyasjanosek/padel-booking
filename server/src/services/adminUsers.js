import { prisma } from "../db/client.js";

const USER_FIELDS = { id: true, email: true, name: true, role: true, createdAt: true };

// Never the password hash or the Google id, this is shown directly in the
// admin users list.
export function listUsersForAdmin() {
  return prisma.user.findMany({ select: USER_FIELDS, orderBy: { id: "asc" } });
}

// Checked before anything else, and without needing a database read: an
// admin can never remove their own admin role, or they could lock
// themselves out with nobody left to undo it. Changing someone else's role,
// including to admin, or changing their own role to admin (a no-op, but not
// worth treating as an error) are both still allowed.
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
