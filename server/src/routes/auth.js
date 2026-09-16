import { randomBytes } from "node:crypto";
import { Router } from "express";
import { validateRegister, validateLogin } from "../middleware/validateAuth.js";
import { requireAuth } from "../middleware/auth.js";
import { registerUser, authenticateUser, toPublicUser } from "../services/auth.js";
import { setSessionCookie, clearSessionCookie, readCookie } from "../services/session.js";
import {
  buildGoogleAuthUrl,
  exchangeCodeForToken,
  fetchGoogleUserInfo,
  findOrCreateGoogleUser,
} from "../services/googleAuth.js";

export const authRouter = Router();

const GOOGLE_STATE_COOKIE = "google_oauth_state";

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

authRouter.get("/auth/google", (req, res) => {
  const state = randomBytes(16).toString("hex");
  res.cookie(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 5 * 60 * 1000,
  });
  res.redirect(buildGoogleAuthUrl(state));
});

authRouter.get("/auth/google/callback", async (req, res) => {
  const loginFailed = () => res.redirect(`${process.env.CLIENT_URL}/login?error=google`);

  const { code, state } = req.query;
  const expectedState = readCookie(req, GOOGLE_STATE_COOKIE);
  res.clearCookie(GOOGLE_STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    return loginFailed();
  }

  try {
    const { access_token: accessToken } = await exchangeCodeForToken(code);
    const profile = await fetchGoogleUserInfo(accessToken);
    if (!profile.email || profile.email_verified !== true) {
      return loginFailed();
    }

    const user = await findOrCreateGoogleUser({
      googleId: profile.sub,
      email: profile.email,
      name: profile.name || profile.email,
    });
    setSessionCookie(res, user.id);
    res.redirect(`${process.env.CLIENT_URL}/account`);
  } catch (error) {
    console.error(error);
    loginFailed();
  }
});
