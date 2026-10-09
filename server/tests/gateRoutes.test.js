import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

vi.mock("../src/services/gateAccess.js", () => ({
  validateGateCode: vi.fn(),
}));

import { createApp } from "../src/app.js";
import { validateGateCode } from "../src/services/gateAccess.js";
import { resetGateRateLimiter } from "../src/middleware/rateLimitGate.js";

let server;
let baseUrl;

beforeAll(async () => {
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://localhost:${server.address().port}`;
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  vi.clearAllMocks();
  resetGateRateLimiter();
});

function postCode(code) {
  return fetch(`${baseUrl}/api/gate/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
}

describe("POST /api/gate/validate", () => {
  it("rejects a missing code without calling the service", async () => {
    const res = await fetch(`${baseUrl}/api/gate/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    expect(validateGateCode).not.toHaveBeenCalled();
  });

  it("rejects a non-string code without calling the service", async () => {
    const res = await postCode(123456);

    expect(res.status).toBe(400);
    expect(validateGateCode).not.toHaveBeenCalled();
  });

  it("returns granted true for a valid code", async () => {
    validateGateCode.mockResolvedValue({ granted: true });

    const res = await postCode("123456");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ granted: true });
    expect(validateGateCode).toHaveBeenCalledWith("123456");
  });

  it("returns granted false for a code that is not valid right now", async () => {
    validateGateCode.mockResolvedValue({ granted: false });

    const res = await postCode("000000");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ granted: false });
  });

  it("blocks with 429 after enough failed attempts from the same caller", async () => {
    validateGateCode.mockResolvedValue({ granted: false });

    for (let i = 0; i < 5; i++) {
      await postCode("000000");
    }
    const res = await postCode("000000");

    expect(res.status).toBe(429);
  });

  it("never rate limits a run of successful codes", async () => {
    validateGateCode.mockResolvedValue({ granted: true });

    for (let i = 0; i < 10; i++) {
      const res = await postCode("123456");
      expect(res.status).toBe(200);
    }
  });
});
