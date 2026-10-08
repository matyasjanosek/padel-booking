import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../src/services/holdExpiry.js", () => ({
  expireStaleHolds: vi.fn(),
}));

import { expireStaleHolds } from "../src/services/holdExpiry.js";
import { startHoldExpiryJob } from "../src/jobs/holdExpiry.js";
import { HOLD_EXPIRY_INTERVAL_SECONDS } from "../src/config.js";

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("startHoldExpiryJob", () => {
  it("does not run immediately, only once the interval has passed", () => {
    expireStaleHolds.mockResolvedValue(0);
    const timer = startHoldExpiryJob();

    expect(expireStaleHolds).not.toHaveBeenCalled();

    clearInterval(timer);
  });

  it("calls expireStaleHolds once per interval", async () => {
    expireStaleHolds.mockResolvedValue(0);
    const timer = startHoldExpiryJob();

    await vi.advanceTimersByTimeAsync(HOLD_EXPIRY_INTERVAL_SECONDS * 1000);
    expect(expireStaleHolds).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(HOLD_EXPIRY_INTERVAL_SECONDS * 1000);
    expect(expireStaleHolds).toHaveBeenCalledTimes(2);

    clearInterval(timer);
  });

  it("logs and keeps running if a sweep fails, rather than crashing the server", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expireStaleHolds.mockRejectedValueOnce(new Error("database is down"));
    const timer = startHoldExpiryJob();

    await vi.advanceTimersByTimeAsync(HOLD_EXPIRY_INTERVAL_SECONDS * 1000);
    expect(consoleError).toHaveBeenCalled();

    clearInterval(timer);
    consoleError.mockRestore();
  });
});
