import { prisma } from "../db/client.js";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

// Must match a redirect URI registered for this client in Google Cloud
// Console. Overridable for environments other than local dev.
function redirectUri() {
  return (
    process.env.GOOGLE_REDIRECT_URI ||
    `http://localhost:${process.env.PORT || 4000}/api/auth/google/callback`
  );
}

export function buildGoogleAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "email profile",
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params}`;
}

export async function exchangeCodeForToken(code) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error("Could not exchange the Google authorization code");
  }
  return res.json();
}

export async function fetchGoogleUserInfo(accessToken) {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error("Could not read the Google account details");
  }
  return res.json();
}

// Same user record as email and password: passwordHash stays null, googleId
// is set instead. If the email already belongs to a password account, this
// links the Google id to it rather than creating a second account.
export async function findOrCreateGoogleUser({ googleId, email, name }) {
  const existingByGoogleId = await prisma.user.findUnique({ where: { googleId } });
  if (existingByGoogleId) {
    return existingByGoogleId;
  }

  const existingByEmail = await prisma.user.findUnique({ where: { email } });
  if (existingByEmail) {
    return prisma.user.update({
      where: { id: existingByEmail.id },
      data: { googleId },
    });
  }

  return prisma.user.create({
    data: { email, name, googleId },
  });
}
