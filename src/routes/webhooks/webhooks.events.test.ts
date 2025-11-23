import { afterAll, beforeAll, describe, expect, it } from "vitest";

import db from "@/db";
import { users } from "@/db/schema";
import env from "@/env";
import { AuthService } from "@/lib/auth";
import { createTestApp } from "@/lib/create-app";
import { cleanupTestDatabase, setupTestDatabase } from "@/lib/test-setup";

import router from "./webhooks.index";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

const app = createTestApp(router);

describe("webhook events API", () => {
  let testDbPath: string;
  let userAccessToken: string;
  let subscriptionId: string;
  let eventId: string;

  beforeAll(async () => {
    testDbPath = await setupTestDatabase();

    // Create test user directly in database
    const testUser = {
      email: `webhook-events-test-${Date.now()}@example.com`,
      password: "WebhookEvents123!",
    };

    const hashedPassword = await AuthService.hashPassword(testUser.password);
    const user = await db.insert(users).values({
      email: testUser.email,
      password: hashedPassword,
      name: "Webhook Events Test User",
      isActive: true,
    }).returning().get();

    userAccessToken = await AuthService.generateAccessToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      isActive: user.isActive,
    });

    // Create a webhook subscription for testing
    const subscriptionData = {
      url: "https://example.com/webhook-events",
      events: JSON.stringify(["product.created"]),
    };

    const subRes = await app.request("/webhooks/subscriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userAccessToken}`,
      },
      body: JSON.stringify(subscriptionData),
    });

    const subData = await subRes.json();
    subscriptionId = subData.id;
  });

  afterAll(async () => {
    await cleanupTestDatabase(testDbPath);
  });

  describe("gET /webhooks/events", () => {
    it("should list webhook events with pagination", async () => {
      const res = await app.request("/webhooks/events?page=1&limit=10", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toBeDefined();
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.meta).toBeDefined();
      expect(json.meta.page).toBe(1);
      expect(json.meta.limit).toBe(10);
    });

    it("should list all events when all=true", async () => {
      const res = await app.request("/webhooks/events?all=true", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json)).toBe(true);
    });

    it("should filter by subscription ID", async () => {
      const res = await app.request(`/webhooks/events?subscriptionId=${subscriptionId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      if (json.data && json.data.length > 0) {
        json.data.forEach((event: any) => {
          expect(event.subscriptionId).toBe(subscriptionId);
        });
      }
    });

    it("should filter by status", async () => {
      const res = await app.request("/webhooks/events?status=delivered", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      if (json.data && json.data.length > 0) {
        json.data.forEach((event: any) => {
          expect(event.status).toBe("delivered");
        });
      }
    });

    it("should support sorting", async () => {
      const resAsc = await app.request("/webhooks/events?sort=ASC", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(resAsc.status).toBe(200);

      const resDesc = await app.request("/webhooks/events?sort=DESC", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(resDesc.status).toBe(200);
    });

    it("should allow viewing events without authentication", async () => {
      const res = await app.request("/webhooks/events", {
        method: "GET",
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toBeDefined();
    });

    it("should validate status enum", async () => {
      const res = await app.request("/webhooks/events?status=invalid-status", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(res.status).toBe(422);
    });

    it("should validate UUID format for subscriptionId", async () => {
      const res = await app.request("/webhooks/events?subscriptionId=invalid-uuid", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(res.status).toBe(422);
    });

    it("should handle pagination parameters correctly", async () => {
      const res = await app.request("/webhooks/events?page=1&limit=5", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.meta.page).toBe(1);
      expect(json.meta.limit).toBe(5);
      if (json.data.length > 0) {
        expect(json.data.length).toBeLessThanOrEqual(5);
      }
    });

    it("should validate pagination limits", async () => {
      const res = await app.request("/webhooks/events?limit=1000", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(res.status).toBe(422);
    });

    it("should handle empty results gracefully", async () => {
      const fakeId = crypto.randomUUID();
      const res = await app.request(`/webhooks/events?subscriptionId=${fakeId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toEqual([]);
      expect(json.meta.total).toBe(0);
    });
  });

  describe("pOST /webhooks/events/:id/retry", () => {
    it("should retry a webhook event", async () => {
      // First get an event to retry
      const listRes = await app.request("/webhooks/events?limit=1", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });

      const listData = await listRes.json();
      if (listData.data && listData.data.length > 0) {
        const eventToRetry = listData.data[0];
        eventId = eventToRetry.id;

        const res = await app.request(`/webhooks/events/${eventId}/retry`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${userAccessToken}`,
          },
        });

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBeDefined();
        expect(json.message).toBeDefined();
      }
    });

    it("should return 404 for non-existent event", async () => {
      const fakeId = crypto.randomUUID();
      const res = await app.request(`/webhooks/events/${fakeId}/retry`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(res.status).toBe(404);
    });

    it("should validate UUID format", async () => {
      const res = await app.request("/webhooks/events/invalid-id/retry", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(res.status).toBe(422);
    });

    it("should return 404 when retrying without authentication", async () => {
      const res = await app.request(`/webhooks/events/${crypto.randomUUID()}/retry`, {
        method: "POST",
      });

      // Without auth, the event won't be found (optionalAuth allows access)
      expect(res.status).toBe(404);
    });
  });
});
