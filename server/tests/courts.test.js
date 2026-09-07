import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

vi.mock("../src/services/courts.js", () => ({
  listCourts: vi.fn(() =>
    Promise.resolve([
      { id: 1, name: "Court 1", isActive: true },
      { id: 2, name: "Court 2", isActive: true },
    ]),
  ),
}));

import { createApp } from "../src/app.js";

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

describe("GET /api/courts", () => {
  it("returns the courts as JSON", async () => {
    const res = await fetch(`${baseUrl}/api/courts`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([
      { id: 1, name: "Court 1", isActive: true },
      { id: 2, name: "Court 2", isActive: true },
    ]);
  });
});
