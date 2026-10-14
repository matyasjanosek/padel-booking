import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/resendClient.js", () => ({
  getResend: vi.fn(),
}));

import { getResend } from "../src/resendClient.js";
import { sendContactMessage } from "../src/services/contactEmail.js";

function fakeResend() {
  return { emails: { send: vi.fn() } };
}

const submission = { name: "Alex", email: "alex@example.com", message: "What are your prices?" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("sendContactMessage", () => {
  it("sends from the configured sender to the centre's own address, with a reply-to", async () => {
    const resend = fakeResend();
    resend.emails.send.mockResolvedValue({ data: { id: "email_1" }, error: null });
    getResend.mockReturnValue(resend);

    await sendContactMessage(submission);

    const call = resend.emails.send.mock.calls[0][0];
    expect(call.from).toBe("onboarding@resend.dev");
    expect(call.to).toBe("info@genpadel.cz");
    expect(call.replyTo).toBe("alex@example.com");
    expect(call.subject).toBe("Contact form message from Alex");
  });

  it("includes the name, email and message in the body", async () => {
    const resend = fakeResend();
    resend.emails.send.mockResolvedValue({ data: { id: "email_1" }, error: null });
    getResend.mockReturnValue(resend);

    await sendContactMessage(submission);

    const text = resend.emails.send.mock.calls[0][0].text;
    expect(text).toContain("Alex");
    expect(text).toContain("alex@example.com");
    expect(text).toContain("What are your prices?");
  });

  it("throws when Resend reports an error", async () => {
    const resend = fakeResend();
    resend.emails.send.mockResolvedValue({
      data: null,
      error: { message: "Invalid from address", statusCode: 422, name: "invalid_from_address" },
    });
    getResend.mockReturnValue(resend);

    await expect(sendContactMessage(submission)).rejects.toThrow("Invalid from address");
  });

  it("propagates a network failure the same way", async () => {
    const resend = fakeResend();
    resend.emails.send.mockRejectedValue(new Error("fetch failed"));
    getResend.mockReturnValue(resend);

    await expect(sendContactMessage(submission)).rejects.toThrow("fetch failed");
  });
});
