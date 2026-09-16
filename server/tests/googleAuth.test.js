import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/db/client.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "../src/db/client.js";
import { buildGoogleAuthUrl, findOrCreateGoogleUser } from "../src/services/googleAuth.js";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GOOGLE_CLIENT_ID = "test-client-id";
});

describe("buildGoogleAuthUrl", () => {
  it("points at Google with the client id, redirect uri and state", () => {
    const url = new URL(buildGoogleAuthUrl("the-state"));
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("test-client-id");
    expect(url.searchParams.get("state")).toBe("the-state");
    expect(url.searchParams.get("response_type")).toBe("code");
  });
});

describe("findOrCreateGoogleUser", () => {
  const details = { googleId: "g-2", email: "player@example.com", name: "Alex" };

  it("returns the existing user when the google id is already linked", async () => {
    const user = { id: 1, googleId: "g-2", email: "player@example.com" };
    prisma.user.findUnique.mockResolvedValueOnce(user);

    const result = await findOrCreateGoogleUser(details);

    expect(result).toBe(user);
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("links the google id to an existing account with the same email", async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce(null) // no user with this google id yet
      .mockResolvedValueOnce({ id: 2, email: "player@example.com", googleId: null }); // registered by email
    const linked = { id: 2, email: "player@example.com", googleId: "g-2" };
    prisma.user.update.mockResolvedValue(linked);

    const result = await findOrCreateGoogleUser(details);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { googleId: "g-2" },
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(result).toBe(linked);
  });

  it("creates a new user when neither the google id nor the email exist", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const created = { id: 3, email: "player@example.com", googleId: "g-2" };
    prisma.user.create.mockResolvedValue(created);

    const result = await findOrCreateGoogleUser(details);

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { email: "player@example.com", name: "Alex", googleId: "g-2" },
    });
    expect(result).toBe(created);
  });
});
