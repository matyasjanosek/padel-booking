import { describe, it, expect, vi } from "vitest";
import { validateContact } from "../src/middleware/validateContact.js";

function fakeResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

const VALID_BODY = { name: "Alex", email: "alex@example.com", message: "Hello there." };

describe("validateContact", () => {
  it("trims the fields and calls next for a valid submission", () => {
    const req = { body: { name: "  Alex  ", email: "  alex@example.com  ", message: "  Hi  " } };
    const next = vi.fn();

    validateContact(req, fakeResponse(), next);

    expect(next).toHaveBeenCalled();
    expect(req.body.name).toBe("Alex");
    expect(req.body.email).toBe("alex@example.com");
    expect(req.body.message).toBe("Hi");
  });

  it("rejects a missing name", () => {
    const req = { body: { ...VALID_BODY, name: "" } };
    const res = fakeResponse();
    validateContact(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });

  it("rejects a missing or invalid email", () => {
    const req = { body: { ...VALID_BODY, email: "not-an-email" } };
    const res = fakeResponse();
    validateContact(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });

  it("rejects a missing message", () => {
    const req = { body: { ...VALID_BODY, message: "   " } };
    const res = fakeResponse();
    validateContact(req, res, vi.fn());
    expect(res.statusCode).toBe(400);
  });
});
