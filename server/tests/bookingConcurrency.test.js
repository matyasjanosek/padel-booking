// Only test in this project that talks to a real database rather than a
// mocked prisma client. Mocking prisma would remove the exact thing being
// proved here: that the (court_id, start_time) unique constraint, not any
// application code, decides which of two racing requests wins.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db/client.js";
import { setSessionCookie } from "../src/services/session.js";

process.env.SESSION_SECRET = "test-secret";

let server;
let baseUrl;
let user;
let court;
const startTime = new Date("2031-06-10T05:00:00.000Z"); // 07:00 Prague, far in the future

function sessionCookieFor(userId) {
  const res = {
    cookie(name, value) {
      this.value = `${name}=${value}`;
    },
  };
  setSessionCookie(res, userId);
  return res.value;
}

beforeAll(async () => {
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://localhost:${server.address().port}`;

  court = await prisma.court.findFirstOrThrow();
  // Clean up in case a previous run of this test crashed before its own
  // cleanup ran.
  await prisma.booking.deleteMany({ where: { courtId: court.id, startTime } });
  user = await prisma.user.create({
    data: { email: "booking-concurrency-test@example.com", name: "Concurrency Test" },
  });
});

afterAll(async () => {
  await prisma.booking.deleteMany({ where: { courtId: court.id, startTime } });
  await prisma.user.delete({ where: { id: user.id } });
  server.close();
});

describe("POST /api/bookings under a race", () => {
  it("lets exactly one of two concurrent requests for the same slot succeed", async () => {
    const cookie = sessionCookieFor(user.id);
    const request = () =>
      fetch(`${baseUrl}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ courtId: court.id, startTime: startTime.toISOString() }),
      });

    const [first, second] = await Promise.all([request(), request()]);
    const statuses = [first.status, second.status].sort();

    expect(statuses).toEqual([201, 409]);

    const bookings = await prisma.booking.findMany({ where: { courtId: court.id, startTime } });
    expect(bookings).toHaveLength(1);
  });
});
