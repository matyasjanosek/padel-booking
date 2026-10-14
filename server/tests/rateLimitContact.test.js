import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rateLimitContact, resetContactRateLimiter } from "../src/middleware/rateLimitContact.js";

function fakeReqRes(ip = "1.2.3.4") {
  const req = { ip };
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  return { req, res };
}

beforeEach(() => {
  resetContactRateLimiter();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimitContact", () => {
  it("lets the first submission through", () => {
    const { req, res } = fakeReqRes();
    const next = vi.fn();

    rateLimitContact(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("lets submissions through up to the limit, then blocks with 429", () => {
    const { req, res } = fakeReqRes();

    rateLimitContact(req, res, vi.fn());
    rateLimitContact(req, res, vi.fn());
    rateLimitContact(req, res, vi.fn());
    const next = vi.fn();
    rateLimitContact(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
  });

  it("counts every submission, not only ones that later fail to send", () => {
    // rateLimitContact itself has no idea whether sending will succeed, it
    // runs before validation and before the email is ever sent.
    const { req, res } = fakeReqRes();

    rateLimitContact(req, res, vi.fn());
    rateLimitContact(req, res, vi.fn());
    rateLimitContact(req, res, vi.fn());
    const next = vi.fn();
    rateLimitContact(req, res, next);

    expect(next).not.toHaveBeenCalled();
  });

  it("tracks each IP address separately", () => {
    const blocked = fakeReqRes("1.1.1.1");
    const clean = fakeReqRes("2.2.2.2");
    for (let i = 0; i < 3; i++) {
      rateLimitContact(blocked.req, blocked.res, vi.fn());
    }

    const next = vi.fn();
    rateLimitContact(clean.req, clean.res, next);

    expect(next).toHaveBeenCalled();
    expect(clean.res.status).not.toHaveBeenCalled();
  });

  it("allows submissions again once the window has passed", () => {
    const { req, res } = fakeReqRes();
    for (let i = 0; i < 3; i++) {
      rateLimitContact(req, res, vi.fn());
    }

    vi.advanceTimersByTime(16 * 60 * 1000);
    const next = vi.fn();
    rateLimitContact(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
