import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../src/services/password.js";

describe("hashPassword and verifyPassword", () => {
  it("verifies the correct password against its hash", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(await verifyPassword("correct-horse-battery-staple", hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("never stores the password in plain text", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(hash).not.toContain("correct-horse-battery-staple");
  });

  it("uses a different salt each time, so the same password hashes differently", async () => {
    const first = await hashPassword("correct-horse-battery-staple");
    const second = await hashPassword("correct-horse-battery-staple");
    expect(first).not.toBe(second);
  });
});
