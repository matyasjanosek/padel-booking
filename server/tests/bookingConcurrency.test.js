// Only test in this project that talks to a real database rather than a
// mocked prisma client. Mocking prisma would remove the exact thing being
// proved here: that the database, not application code, decides which of
// two racing requests wins, now entirely through court_slots's own primary
// key on (court_id, slot_start), whether the two requests share the exact
// same start time or merely overlap.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db/client.js";
import { setSessionCookie } from "../src/services/session.js";

process.env.SESSION_SECRET = "test-secret";

let server;
let baseUrl;
let user;
let court;

// All far in the future, and each test uses its own start times so the
// tests below never interfere with one another.
const sameStartSlot = new Date("2031-06-10T05:00:00.000Z"); // 07:00 Prague
const reusableSlot = new Date("2031-06-11T05:00:00.000Z");
const overlapBase = new Date("2031-06-12T16:00:00.000Z"); // 18:00 Prague
const overlapInner = new Date("2031-06-12T17:00:00.000Z"); // 19:00 Prague
const concurrentOverlapBase = new Date("2031-06-13T16:00:00.000Z");
const concurrentOverlapInner = new Date("2031-06-13T17:00:00.000Z");

const ALL_STARTS = [
  sameStartSlot,
  reusableSlot,
  overlapBase,
  overlapInner,
  concurrentOverlapBase,
  concurrentOverlapInner,
];

function sessionCookieFor(userId) {
  const res = {
    cookie(name, value) {
      this.value = `${name}=${value}`;
    },
  };
  setSessionCookie(res, userId);
  return res.value;
}

function postBooking(cookie, startTime, durationMinutes = 60) {
  return fetch(`${baseUrl}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      courtId: court.id,
      startTime: startTime.toISOString(),
      durationMinutes,
    }),
  });
}

async function cleanUp() {
  // court_slots rows cascade with their booking, nothing to clean up there
  // separately.
  await prisma.booking.deleteMany({
    where: { courtId: court.id, startTime: { in: ALL_STARTS } },
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
  await cleanUp();
  user = await prisma.user.create({
    data: { email: "booking-concurrency-test@example.com", name: "Concurrency Test" },
  });
});

afterAll(async () => {
  await cleanUp();
  await prisma.user.delete({ where: { id: user.id } });
  server.close();
});

describe("POST /api/bookings under a race", () => {
  it("lets exactly one of two concurrent requests for a brand new slot succeed", async () => {
    const cookie = sessionCookieFor(user.id);

    const [first, second] = await Promise.all([
      postBooking(cookie, sameStartSlot),
      postBooking(cookie, sameStartSlot),
    ]);
    const statuses = [first.status, second.status].sort();

    expect(statuses).toEqual([201, 409]);

    const bookings = await prisma.booking.findMany({
      where: { courtId: court.id, startTime: sameStartSlot },
    });
    expect(bookings).toHaveLength(1);

    // The loser's failed insert leaves no court_slots row of its own
    // behind, only the one hour (two units) the winner actually holds.
    const slots = await prisma.courtSlot.findMany({ where: { bookingId: bookings[0].id } });
    expect(slots).toHaveLength(2);
  });

  it("lets a cancelled booking's start time be booked again by someone else", async () => {
    const owner = sessionCookieFor(user.id);
    const created = await postBooking(owner, reusableSlot);
    const { id } = await created.json();

    await fetch(`${baseUrl}/api/bookings/${id}/cancel`, {
      method: "POST",
      headers: { Cookie: owner },
    });

    const otherUser = await prisma.user.create({
      data: { email: "booking-concurrency-other-test@example.com", name: "Someone Else" },
    });
    try {
      const res = await postBooking(sessionCookieFor(otherUser.id), reusableSlot);

      expect(res.status).toBe(201);
    } finally {
      await prisma.booking.deleteMany({ where: { userId: otherUser.id } });
      await prisma.user.delete({ where: { id: otherUser.id } });
    }
  });

  it("does not let an overlapping booking with a different start time succeed, and leaves no partial court_slot rows behind", async () => {
    const cookie = sessionCookieFor(user.id);

    // 18:00 to 20:00, two hours, four units.
    const first = await postBooking(cookie, overlapBase, 120);
    expect(first.status).toBe(201);
    const firstBooking = await first.json();

    // 19:00 to 20:00 overlaps the back half of the booking above, even
    // though its own start time was never taken on its own.
    const second = await postBooking(cookie, overlapInner, 60);

    expect(second.status).toBe(409);

    const bookings = await prisma.booking.findMany({
      where: { courtId: court.id, startTime: { in: [overlapBase, overlapInner] } },
    });
    expect(bookings).toHaveLength(1);

    const slots = await prisma.courtSlot.findMany({ where: { bookingId: firstBooking.id } });
    expect(slots).toHaveLength(4);
  });

  it("does not let an overlapping booking with a different start time succeed, run concurrently through the real API", async () => {
    const cookie = sessionCookieFor(user.id);

    const [first, second] = await Promise.all([
      postBooking(cookie, concurrentOverlapBase, 120),
      postBooking(cookie, concurrentOverlapInner, 60),
    ]);

    const statuses = [first.status, second.status].sort();
    // A genuine race for the same unique index can surface at MySQL's own
    // level either as a plain duplicate key (P2002) or, between two
    // transactions both inserting into it at once, as a write conflict or
    // deadlock (P2034); the route turns both into the same 409, so only one
    // request ever succeeds either way.
    expect(statuses).toEqual([201, 409]);

    const bookings = await prisma.booking.findMany({
      where: {
        courtId: court.id,
        startTime: { in: [concurrentOverlapBase, concurrentOverlapInner] },
      },
    });
    expect(bookings).toHaveLength(1);
  });
});
