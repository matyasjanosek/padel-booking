import { prisma } from "../db/client.js";
import { hashPassword, verifyPassword } from "./password.js";

export async function registerUser({ email, password, name }) {
  const passwordHash = await hashPassword(password);
  return prisma.user.create({
    data: { email, passwordHash, name },
  });
}

export async function authenticateUser({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    return null;
  }
  const valid = await verifyPassword(password, user.passwordHash);
  return valid ? user : null;
}

export function getUserById(id) {
  return prisma.user.findUnique({ where: { id } });
}

export function toPublicUser(user) {
  const { id, email, name, role, createdAt } = user;
  return { id, email, name, role, createdAt };
}
