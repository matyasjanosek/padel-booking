// Real database, not a mocked prisma client, the same reason as
// bookingConcurrency.test.js: mocking listBookingsForUser would just prove
// the mock returns what it was told to, not that a different user's
// session genuinely cannot see this booking or its gate code.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db/client.js";
import { setSessionCookie } from "../src/services/session.js";

process.env.SESSION_SECRET = "test-secret";

let server;
let baseUrl;
let owner;
let otherUser;
let court;
let booking;
const startTime = new Date("2031-06-10T16:00:00.000Z"); // 18:00 Prague summer time

function sessionCookieFor(userId) {
  const res = {
    cookie(name, value) {
      this.value = `${name}=${value}`;
    },
  };
  setSessionCookie(res, userId);
  return res.value;
}

function getBookings(cookie) {
  return fetch(`${baseUrl}/api/bookings`, { headers: { Cookie: cookie } });
}

beforeAll(async () => {
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://localhost:${server.address().port}`;

  court = await prisma.court.findFirstOrThrow();
  owner = await prisma.user.create({
    data: { email: "gate-code-owner-test@example.com", name: "Owner" },
  });
  otherUser = await prisma.user.create({
    data: { email: "gate-code-other-test@example.com", name: "Someone Else" },
  });
  booking = await prisma.booking.create({
    data: {
      userId: owner.id,
      courtId: court.id,
      startTime,
      endTime: new Date(startTime.getTime() + 60 * 60 * 1000),
      status: "confirmed",
      price: 400,
      gateCode: "248613",
    },
  });
});

afterAll(async () => {
  await prisma.booking.delete({ where: { id: booking.id } });
  await prisma.user.deleteMany({ where: { id: { in: [owner.id, otherUser.id] } } });
  server.close();
});

describe("GET /api/bookings and the gate code", () => {
  it("returns the gate code and its window to the booking's own owner", async () => {
    const res = await getBookings(sessionCookieFor(owner.id));
    const bookings = await res.json();

    const found = bookings.find((b) => b.id === booking.id);
    expect(found.gateCode).toBe("248613");
    expect(found.gateCodeValidFrom).toBe("2031-06-10T17:40:00.000+02:00");
    expect(found.gateCodeValidUntil).toBe("2031-06-10T18:45:00.000+02:00");
  });

  it("never returns this booking, or its gate code, to a different user", async () => {
    const res = await getBookings(sessionCookieFor(otherUser.id));
    const bookings = await res.json();

    expect(bookings.find((b) => b.id === booking.id)).toBeUndefined();
    expect(JSON.stringify(bookings)).not.toContain("248613");
  });
});
