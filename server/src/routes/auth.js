import { Router } from "express";
import { validateRegister, validateLogin } from "../middleware/validateAuth.js";
import { requireAuth } from "../middleware/auth.js";
import { registerUser, authenticateUser, toPublicUser } from "../services/auth.js";
import { setSessionCookie, clearSessionCookie } from "../services/session.js";

export const authRouter = Router();

authRouter.post("/auth/register", validateRegister, async (req, res) => {
  try {
    const user = await registerUser(req.body);
    setSessionCookie(res, user.id);
    res.status(201).json(toPublicUser(user));
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Email is already registered" });
    }
    console.error(error);
    res.status(500).json({ error: "Could not create account" });
  }
});

authRouter.post("/auth/login", validateLogin, async (req, res) => {
  try {
    const user = await authenticateUser(req.body);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    setSessionCookie(res, user.id);
    res.json(toPublicUser(user));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not log in" });
  }
});

authRouter.post("/auth/logout", (req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});

authRouter.get("/auth/me", requireAuth, (req, res) => {
  res.json(toPublicUser(req.user));
});
