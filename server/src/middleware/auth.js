import { readSessionUserId } from "../services/session.js";
import { getUserById } from "../services/auth.js";

export async function requireAuth(req, res, next) {
  const userId = readSessionUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "You must be logged in" });
  }
  const user = await getUserById(userId);
  if (!user) {
    return res.status(401).json({ error: "You must be logged in" });
  }
  req.user = user;
  next();
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admins only" });
  }
  next();
}
