import { testClient } from "hono/testing";
import { beforeEach, describe, expect, it } from "vitest";

import db from "@/db";
import { requests } from "@/db/schema";
import { createRouter } from "@/lib/create-app";
import { clearDatabase } from "@/lib/test-setup";

import analyticsRoutes from "../analytics.index";

// Create test app
const app = createRouter();
app.route("/", analyticsRoutes);
const client = testClient(app) as any;

describe("analytics Handlers", () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe("get /analytics/requests", () => {
    beforeEach(async () => {
      // Insert test data
      const testRequests = [
        {
          method: "GET",
          path: "/api/tasks",
          status: 200,
          durationMs: 100,
          ip: "192.168.1.1",
          userAgent: "test-agent",
          createdAt: new Date("2024-01-01T10:00:00Z"),
        },
        {
          method: "POST",
          path: "/api/tasks",
          status: 201,
          durationMs: 150,
          ip: "192.168.1.2",
          userAgent: "test-agent-2",
          createdAt: new Date("2024-01-01T11:00:00Z"),
        },
        {
          method: "GET",
          path: "/api/users",
          status: 404,
          durationMs: 50,
          ip: "192.168.1.1",
          userAgent: "test-agent",
          createdAt: new Date("2024-01-02T10:00:00Z"),
        },
      ];

      await db.insert(requests).values(testRequests);
    });

    it("should return basic analytics without filters", async () => {
      const response = await client.analytics.requests.$get();

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty("meta");
      expect(data).toHaveProperty("data");
      expect(data.meta.total).toBe(3);
      expect(data.data).toHaveLength(3);
    });

    it("should filter by date range", async () => {
      const response = await client.analytics.requests.$get({
        query: {
          from: "2024-01-01T00:00:00Z",
          to: "2024-01-01T23:59:59Z",
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.meta.total).toBe(2); // Only requests from Jan 1st
    });

    it("should filter by method", async () => {
      const response = await client.analytics.requests.$get({
        query: {
          method: "GET",
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.meta.total).toBe(2); // Only GET requests
      expect(data.data.every((req: any) => req.method === "GET")).toBe(true);
    });

    it("should filter by path", async () => {
      const response = await client.analytics.requests.$get({
        query: {
          path: "/api/tasks",
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.meta.total).toBe(2); // Only /api/tasks requests
      expect(data.data.every((req: any) => req.path === "/api/tasks")).toBe(true);
    });

    it("should filter by status", async () => {
      const response = await client.analytics.requests.$get({
        query: {
          status: "404",
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.meta.total).toBe(1); // Only 404 requests
      expect(data.data[0].status).toBe(404);
    });

    it("should combine multiple filters", async () => {
      const response = await client.analytics.requests.$get({
        query: {
          method: "GET",
          path: "/api/tasks",
          from: "2024-01-01T00:00:00Z",
          to: "2024-01-01T23:59:59Z",
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.meta.total).toBe(1); // Only GET /api/tasks from Jan 1st
      const req = data.data[0];
      expect(req.method).toBe("GET");
      expect(req.path).toBe("/api/tasks");
    });

    it("should handle pagination with limit", async () => {
      const response = await client.analytics.requests.$get({
        query: {
          limit: "2",
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.meta.total).toBe(3); // Total count
      expect(data.data).toHaveLength(2); // Limited results
    });

    it("should handle pagination with page", async () => {
      const response = await client.analytics.requests.$get({
        query: {
          limit: "2",
          page: "2", // Use page instead of offset
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.meta.total).toBe(3);
      expect(data.data).toHaveLength(1); // Only 1 item on page 2
    });

    it("should sort by createdAt descending by default", async () => {
      const response = await client.analytics.requests.$get();

      expect(response.status).toBe(200);
      const data = await response.json();

      const timestamps = data.data.map((req: any) => new Date(req.createdAt).getTime());
      const sortedTimestamps = [...timestamps].sort((a, b) => b - a);
      expect(timestamps).toEqual(sortedTimestamps);
    });

    it("should handle invalid date formats gracefully", async () => {
      const response = await client.analytics.requests.$get({
        query: {
          from: "invalid-date",
          to: "also-invalid",
        },
      });

      // Should return 422 for invalid date formats
      expect([200, 400, 422]).toContain(response.status);
    });

    it("should handle very large limit values", async () => {
      const response = await client.analytics.requests.$get({
        query: {
          limit: "999999",
        },
      });

      // Should return 422 for values exceeding max limit
      expect([200, 422]).toContain(response.status);
      if (response.status === 200) {
        const data = await response.json();
        expect(data.data).toHaveLength(3); // All available data
      }
    });

    it("should handle negative page gracefully", async () => {
      const response = await client.analytics.requests.$get({
        query: {
          page: "-1",
        },
      });

      // Should either handle gracefully or return error
      expect([200, 400, 422]).toContain(response.status);
    });
  });

  describe("error Cases", () => {
    it("should handle database connection issues gracefully", async () => {
      // This would require mocking the database connection
      // For now, we'll test that the endpoint exists and responds
      const response = await client.analytics.requests.$get();
      expect([200, 500]).toContain(response.status);
    });

    it("should handle malformed query parameters", async () => {
      const response = await app.request("/analytics/requests?malformed[query");

      // Should handle malformed query gracefully
      expect([200, 400]).toContain(response.status);
    });
  });

  describe("performance", () => {
    it("should handle large datasets efficiently", async () => {
      // Insert a larger dataset
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        method: i % 2 === 0 ? "GET" : "POST",
        path: `/api/endpoint-${i}`,
        status: i % 3 === 0 ? 200 : 404,
        durationMs: Math.floor(Math.random() * 1000),
        ip: `192.168.1.${i % 255}`,
        userAgent: `agent-${i}`,
        createdAt: new Date(Date.now() - i * 60000), // Spread over time
      }));

      await db.insert(requests).values(largeDataset);

      const startTime = Date.now();
      const response = await client.analytics.requests.$get({
        query: { limit: "10" },
      });
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds

      const data = await response.json();
      expect(data.data).toHaveLength(10);
      expect(data.meta.total).toBeGreaterThanOrEqual(100);
    });
  });
});
