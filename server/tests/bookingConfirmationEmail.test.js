import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/resendClient.js", () => ({
  getResend: vi.fn(),
}));

import { getResend } from "../src/resendClient.js";
import { sendBookingConfirmationEmail } from "../src/services/bookingConfirmationEmail.js";

function fakeResend() {
  return { emails: { send: vi.fn() } };
}

// 2030-06-10T16:00Z is 18:00 Prague summer time, 17:00Z is 19:00.
const booking = {
  id: 1,
  status: "confirmed",
  gateCode: "123456",
  startTime: new Date("2030-06-10T16:00:00.000Z"),
  endTime: new Date("2030-06-10T17:00:00.000Z"),
  price: { toString: () => "400" },
  user: { name: "Alex", email: "alex@example.com" },
  court: { name: "Court 1" },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("sendBookingConfirmationEmail", () => {
  it("sends from the Resend sandbox address to the booking's own user", async () => {
    const resend = fakeResend();
    resend.emails.send.mockResolvedValue({ data: { id: "email_1" }, error: null });
    getResend.mockReturnValue(resend);

    await sendBookingConfirmationEmail(booking);

    const call = resend.emails.send.mock.calls[0][0];
    expect(call.from).toBe("onboarding@resend.dev");
    expect(call.to).toBe("alex@example.com");
    expect(call.subject).toBe("Your court is booked, GEN PADEL Rožnov");
  });

  it("includes the court, the date and time, the price and the gate code with its validity window", async () => {
    const resend = fakeResend();
    resend.emails.send.mockResolvedValue({ data: { id: "email_1" }, error: null });
    getResend.mockReturnValue(resend);

    await sendBookingConfirmationEmail(booking);

    const text = resend.emails.send.mock.calls[0][0].text;
    expect(text).toContain("Court 1");
    expect(text).toContain("18:00 to 19:00");
    expect(text).toContain("400 CZK");
    expect(text).toContain("123456");
    // 20 minutes before 18:00, 45 minutes after 18:00, not measured from the end.
    expect(text).toContain("17:40 to 18:45");
  });

  it("throws when Resend reports an error, so the caller decides what to do", async () => {
    const resend = fakeResend();
    resend.emails.send.mockResolvedValue({
      data: null,
      error: { message: "Invalid from address", statusCode: 422, name: "invalid_from_address" },
    });
    getResend.mockReturnValue(resend);

    await expect(sendBookingConfirmationEmail(booking)).rejects.toThrow("Invalid from address");
  });

  it("propagates a network failure the same way", async () => {
    const resend = fakeResend();
    resend.emails.send.mockRejectedValue(new Error("fetch failed"));
    getResend.mockReturnValue(resend);

    await expect(sendBookingConfirmationEmail(booking)).rejects.toThrow("fetch failed");
  });
});
