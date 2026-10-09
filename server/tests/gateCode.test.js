import { describe, it, expect } from "vitest";
import { generateGateCode } from "../src/services/gateCode.js";

describe("generateGateCode", () => {
  it("returns a 6 digit numeric string", () => {
    const code = generateGateCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it("is not the same every time", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateGateCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});
