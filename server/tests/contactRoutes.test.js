import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

vi.mock("../src/services/contactEmail.js", () => ({
  sendContactMessage: vi.fn(),
}));

import { createApp } from "../src/app.js";
import { sendContactMessage } from "../src/services/contactEmail.js";
import { resetContactRateLimiter } from "../src/middleware/rateLimitContact.js";

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
  resetContactRateLimiter();
});

const VALID_BODY = { name: "Alex", email: "alex@example.com", message: "Hello there." };

function postContact(body) {
  return fetch(`${baseUrl}/api/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/contact", () => {
  it("sends the message for a valid submission", async () => {
    sendContactMessage.mockResolvedValue(undefined);

    const res = await postContact(VALID_BODY);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: true });
    expect(sendContactMessage).toHaveBeenCalledWith(VALID_BODY);
  });

  it("rejects a submission with a missing field, without sending anything", async () => {
    const res = await postContact({ ...VALID_BODY, email: "" });

    expect(res.status).toBe(400);
    expect(sendContactMessage).not.toHaveBeenCalled();
  });

  it("returns 500 when the send itself fails", async () => {
    sendContactMessage.mockRejectedValue(new Error("Resend is down"));

    const res = await postContact(VALID_BODY);

    expect(res.status).toBe(500);
  });

  it("blocks with 429 after enough submissions from the same caller", async () => {
    sendContactMessage.mockResolvedValue(undefined);

    for (let i = 0; i < 3; i++) {
      await postContact(VALID_BODY);
    }
    const res = await postContact(VALID_BODY);

    expect(res.status).toBe(429);
    expect(sendContactMessage).toHaveBeenCalledTimes(3);
  });

  it("counts an invalid submission against the rate limit too", async () => {
    for (let i = 0; i < 3; i++) {
      await postContact({ ...VALID_BODY, email: "" });
    }
    const res = await postContact(VALID_BODY);

    expect(res.status).toBe(429);
    expect(sendContactMessage).not.toHaveBeenCalled();
  });
});
