import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";

import db from "@/db";
import { insertRequestsSchema, requests } from "@/db/schema";
import env from "@/env";
import { cleanupTestDatabase, setupTestDatabase } from "@/lib/test-setup";
import { getCounts, logRequest } from "@/services/analytics.service";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

describe("analyticsService - Aggregation Queries", () => {
  let testDbPath: string;
  let originalAnalyticsEnabled: boolean;

  beforeAll(async () => {
    testDbPath = await setupTestDatabase();
    // Enable analytics for these tests
    originalAnalyticsEnabled = env.ENABLE_ANALYTICS;
    (env as any).ENABLE_ANALYTICS = true;
  }, 30000);

  afterAll(async () => {
    await cleanupTestDatabase(testDbPath);
    // Restore original analytics setting
    (env as any).ENABLE_ANALYTICS = originalAnalyticsEnabled;
  });

  it("should return zero counts for empty database", async () => {
    const result = await getCounts();

    expect(result.total).toBe(0);
    expect(result.data.length).toBe(0);
  });

  it("should return correct total count", async () => {
    // Insert test data
    await db.insert(requests)
      .values([
        insertRequestsSchema.parse({
          method: "GET",
          path: "/api/test",
          status: 200,
          durationMs: 100,
        }),
        insertRequestsSchema.parse({
          method: "POST",
          path: "/api/users",
          status: 201,
          durationMs: 250,
        }),
      ])
      .run();

    const result = await getCounts();

    expect(result.total).toBe(2);
  });

  it("should return correct per-path aggregation", async () => {
    // Clear previous data
    await db.delete(requests).run();

    // Insert test data with different paths
    await db.insert(requests)
      .values([
        insertRequestsSchema.parse({
          method: "GET",
          path: "/api/users",
          status: 200,
          durationMs: 100,
        }),
        insertRequestsSchema.parse({
          method: "POST",
          path: "/api/users",
          status: 201,
          durationMs: 200,
        }),
        insertRequestsSchema.parse({
          method: "GET",
          path: "/api/posts",
          status: 200,
          durationMs: 150,
        }),
      ])
      .run();

    const result = await getCounts({
      groupBy: "path",
    });

    expect(result.total).toBe(3);

    const usersPath = result.data.find(p => p.key === "/api/users");
    const postsPath = result.data.find(p => p.key === "/api/posts");

    expect(usersPath?.count).toBe(2);
    expect(postsPath?.count).toBe(1);
  });

  it("should return correct per-method aggregation", async () => {
    // Clear previous data
    await db.delete(requests).run();

    // Insert test data with different methods
    await db.insert(requests)
      .values([
        insertRequestsSchema.parse({
          method: "GET",
          path: "/api/users",
          status: 200,
          durationMs: 100,
        }),
        insertRequestsSchema.parse({
          method: "GET",
          path: "/api/posts",
          status: 200,
          durationMs: 120,
        }),
        insertRequestsSchema.parse({
          method: "POST",
          path: "/api/users",
          status: 201,
          durationMs: 200,
        }),
        insertRequestsSchema.parse({
          method: "PUT",
          path: "/api/users/1",
          status: 200,
          durationMs: 180,
        }),
      ])
      .run();

    const result = await getCounts({
      groupBy: "method",
    });

    expect(result.total).toBe(4);

    const getMethod = result.data.find(m => m.key === "GET");
    const postMethod = result.data.find(m => m.key === "POST");
    const putMethod = result.data.find(m => m.key === "PUT");

    expect(getMethod?.count).toBe(2);
    expect(postMethod?.count).toBe(1);
    expect(putMethod?.count).toBe(1);
  });

  it("should handle logRequest function", async () => {
    // Clear previous data
    await db.delete(requests).run();

    const requestData = {
      method: "GET",
      path: "/api/test",
      status: 200,
      durationMs: 100,
      ip: "127.0.0.1",
      userAgent: "test-agent",
      referer: "http://test.com",
    };

    // Log the request
    logRequest(requestData);

    // Wait for the microtask to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify the request was logged
    const result = await getCounts({
      groupBy: "path",
    });

    expect(result.total).toBe(1);
    expect(result.data[0].key).toBe("/api/test");
    expect(result.data[0].count).toBe(1);
  });
});
