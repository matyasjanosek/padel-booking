// Only test in this project that talks to a real database rather than a
// mocked prisma client. Mocking prisma would remove the exact thing being
// proved here: that the database, not application code, decides which of
// two racing requests wins, for a brand new slot via the unique constraint
// and for a stale one via the reclaim update's guarded WHERE clause.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db/client.js";
import { setSessionCookie } from "../src/services/session.js";

process.env.SESSION_SECRET = "test-secret";

let server;
let baseUrl;
let user;
let court;
const freshSlot = new Date("2031-06-10T05:00:00.000Z"); // 07:00 Prague, far in the future
const staleSlot = new Date("2031-06-11T05:00:00.000Z");

function sessionCookieFor(userId) {
  const res = {
    cookie(name, value) {
      this.value = `${name}=${value}`;
    },
  };
  setSessionCookie(res, userId);
  return res.value;
}

function postBooking(cookie, startTime) {
  return fetch(`${baseUrl}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ courtId: court.id, startTime: startTime.toISOString() }),
  });
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
  await prisma.booking.deleteMany({
    where: { courtId: court.id, startTime: { in: [freshSlot, staleSlot] } },
  });
  user = await prisma.user.create({
    data: { email: "booking-concurrency-test@example.com", name: "Concurrency Test" },
  });
});

afterAll(async () => {
  await prisma.booking.deleteMany({
    where: { courtId: court.id, startTime: { in: [freshSlot, staleSlot] } },
  });
  await prisma.user.delete({ where: { id: user.id } });
  server.close();
});

describe("POST /api/bookings under a race", () => {
  it("lets exactly one of two concurrent requests for a brand new slot succeed", async () => {
    const cookie = sessionCookieFor(user.id);

    const [first, second] = await Promise.all([
      postBooking(cookie, freshSlot),
      postBooking(cookie, freshSlot),
    ]);
    const statuses = [first.status, second.status].sort();

    expect(statuses).toEqual([201, 409]);

    const bookings = await prisma.booking.findMany({
      where: { courtId: court.id, startTime: freshSlot },
    });
    expect(bookings).toHaveLength(1);
  });

  it("lets exactly one of two concurrent requests reclaim the same stale slot succeed", async () => {
    const stale = await prisma.booking.create({
      data: {
        userId: user.id,
        courtId: court.id,
        startTime: staleSlot,
        endTime: new Date(staleSlot.getTime() + 60 * 60 * 1000),
        status: "pending",
        price: 400,
        holdExpiresAt: new Date(Date.now() - 60 * 1000), // already expired
      },
    });
    const cookie = sessionCookieFor(user.id);

    const [first, second] = await Promise.all([
      postBooking(cookie, staleSlot),
      postBooking(cookie, staleSlot),
    ]);
    const statuses = [first.status, second.status].sort();

    expect(statuses).toEqual([201, 409]);

    const bookings = await prisma.booking.findMany({
      where: { courtId: court.id, startTime: staleSlot },
    });
    expect(bookings).toHaveLength(1);
    // The stale row is reused, not replaced, same id, now pending again.
    expect(bookings[0].id).toBe(stale.id);
    expect(bookings[0].status).toBe("pending");
  });
});
