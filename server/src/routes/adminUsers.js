import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { validateChangeRole } from "../middleware/validateAdminUsers.js";
import { listUsersForAdmin, changeUserRole } from "../services/adminUsers.js";

export const adminUsersRouter = Router();

adminUsersRouter.get("/admin/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await listUsersForAdmin();
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not load users" });
  }
});

adminUsersRouter.post(
  "/admin/users/:id/role",
  requireAuth,
  requireAdmin,
  validateChangeRole,
  async (req, res) => {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    try {
      const result = await changeUserRole(userId, req.body.role, req.user.id);
      if (result.outcome === "cannot_remove_own_admin") {
        return res.status(409).json({ error: "You cannot remove your own admin role" });
      }
      if (result.outcome === "not_found") {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(result.user);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Could not change the user's role" });
    }
  },
);
