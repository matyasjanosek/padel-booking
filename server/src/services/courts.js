import { prisma } from "../db/client.js";

export function listCourts() {
  return prisma.court.findMany({ orderBy: { id: "asc" } });
}
