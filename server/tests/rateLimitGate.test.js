import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  rateLimitGate,
  recordFailedGateAttempt,
  resetGateRateLimiter,
} from "../src/middleware/rateLimitGate.js";

function fakeReqRes(ip = "1.2.3.4") {
  const req = { ip };
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  return { req, res };
}

beforeEach(() => {
  resetGateRateLimiter();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimitGate", () => {
  it("lets a request through when there have been no failures yet", () => {
    const { req, res } = fakeReqRes();
    const next = vi.fn();

    rateLimitGate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("lets requests through up to the limit, then blocks with 429", () => {
    const { req, res } = fakeReqRes();

    for (let i = 0; i < 5; i++) {
      recordFailedGateAttempt(req.ip);
    }
    const next = vi.fn();

    rateLimitGate(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
  });

  it("does not block while still under the limit", () => {
    const { req, res } = fakeReqRes();

    for (let i = 0; i < 4; i++) {
      recordFailedGateAttempt(req.ip);
    }
    const next = vi.fn();

    rateLimitGate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("tracks each IP address separately", () => {
    const blocked = fakeReqRes("1.1.1.1");
    const clean = fakeReqRes("2.2.2.2");
    for (let i = 0; i < 5; i++) {
      recordFailedGateAttempt(blocked.req.ip);
    }

    const next = vi.fn();
    rateLimitGate(clean.req, clean.res, next);

    expect(next).toHaveBeenCalled();
    expect(clean.res.status).not.toHaveBeenCalled();
  });

  it("allows requests again once the window has passed", () => {
    const { req, res } = fakeReqRes();
    for (let i = 0; i < 5; i++) {
      recordFailedGateAttempt(req.ip);
    }

    vi.advanceTimersByTime(16 * 60 * 1000);
    const next = vi.fn();
    rateLimitGate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
