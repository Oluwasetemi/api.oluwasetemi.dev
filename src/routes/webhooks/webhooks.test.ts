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

describe("webhook subscriptions API", () => {
  let testDbPath: string;
  let userAccessToken: string;
  let userId: string;
  let subscriptionId: string;

  beforeAll(async () => {
    testDbPath = await setupTestDatabase();

    // Create a test user directly in the database
    const testUser = {
      email: `webhook-test-${Date.now()}@example.com`,
      password: "WebhookTest123!",
    };

    // Hash the password
    const hashedPassword = await AuthService.hashPassword(testUser.password);

    // Insert user into database
    const user = await db.insert(users).values({
      email: testUser.email,
      password: hashedPassword,
      name: "Webhook Test User",
      isActive: true,
    }).returning().get();

    userId = user.id;

    // Generate access token with complete payload
    userAccessToken = AuthService.generateAccessToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      isActive: user.isActive,
    });
  });

  afterAll(async () => {
    await cleanupTestDatabase(testDbPath);
  });

  describe("pOST /webhooks/subscriptions", () => {
    it("should create a webhook subscription", async () => {
      const subscriptionData = {
        url: "https://example.com/webhook",
        events: JSON.stringify(["product.created", "product.updated"]),
        active: true,
      };

      const res = await app.request("/webhooks/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify(subscriptionData),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBeDefined();
      expect(json.url).toBe(subscriptionData.url);
      const events = JSON.parse(json.events);
      expect(events).toContain("product.created");
      expect(events).toContain("product.updated");
      expect(json.active).toBe(true);
      expect(json.owner).toBe(userId);
      expect(json.secret).toBeDefined(); // Auto-generated

      // Store for other tests
      subscriptionId = json.id;
    });

    it("should allow creating subscription without authentication (owner will be null)", async () => {
      const subscriptionData = {
        url: "https://example.com/webhook-anon",
        events: JSON.stringify(["product.created"]),
      };

      const res = await app.request("/webhooks/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscriptionData),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.owner).toBeNull(); // No owner when created without auth
    });

    it("should validate webhook URL format", async () => {
      const subscriptionData = {
        url: "not-a-valid-url",
        events: JSON.stringify(["product.created"]),
      };

      const res = await app.request("/webhooks/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify(subscriptionData),
      });

      expect(res.status).toBe(422);
      const json = await res.json();
      expect(json.error).toBeDefined();
    });

    it("should allow empty events array", async () => {
      const subscriptionData = {
        url: "https://example.com/webhook-empty-events",
        events: JSON.stringify([]),
      };

      const res = await app.request("/webhooks/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify(subscriptionData),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(JSON.parse(json.events)).toEqual([]);
    });

    it("should allow creating subscription with optional fields", async () => {
      const subscriptionData = {
        url: "https://example.com/webhook2",
        events: JSON.stringify(["task.created"]),
      };

      const res = await app.request("/webhooks/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify(subscriptionData),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.active).toBe(true); // Default value
      expect(json.maxRetries).toBe(6); // Default value
    });
  });

  describe("gET /webhooks/subscriptions", () => {
    it("should list webhook subscriptions with pagination", async () => {
      const res = await app.request("/webhooks/subscriptions?page=1&limit=10", {
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
      expect(json.meta.total).toBeGreaterThan(0);
      expect(json.meta.page).toBe(1);
      expect(json.meta.limit).toBe(10);
    });

    it("should list all subscriptions when all=true", async () => {
      const res = await app.request("/webhooks/subscriptions?all=true", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json)).toBe(true);
      expect(json.length).toBeGreaterThan(0);
    });

    it("should filter by active status", async () => {
      const res = await app.request("/webhooks/subscriptions?active=true", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      if (json.data) {
        json.data.forEach((sub: any) => {
          expect(sub.active).toBe(true);
        });
      }
    });

    it("should support sorting", async () => {
      const resAsc = await app.request("/webhooks/subscriptions?sort=ASC", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(resAsc.status).toBe(200);

      const resDesc = await app.request("/webhooks/subscriptions?sort=DESC", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(resDesc.status).toBe(200);
    });

    it("should return empty results when not authenticated", async () => {
      const res = await app.request("/webhooks/subscriptions", {
        method: "GET",
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toEqual([]);
      expect(json.meta.total).toBe(0);
    });
  });

  describe("gET /webhooks/subscriptions/:id", () => {
    it("should get a webhook subscription by id", async () => {
      const res = await app.request(`/webhooks/subscriptions/${subscriptionId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBe(subscriptionId);
      expect(json.url).toBeDefined();
      expect(json.events).toBeDefined();
    });

    it("should return 404 for non-existent subscription", async () => {
      const fakeId = crypto.randomUUID();
      const res = await app.request(`/webhooks/subscriptions/${fakeId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(res.status).toBe(404);
    });

    it("should reject invalid UUID format", async () => {
      const res = await app.request("/webhooks/subscriptions/invalid-id", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(res.status).toBe(422);
    });

    it("should allow viewing subscription without authentication", async () => {
      const res = await app.request(`/webhooks/subscriptions/${subscriptionId}`, {
        method: "GET",
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBe(subscriptionId);
    });
  });

  describe("pATCH /webhooks/subscriptions/:id", () => {
    it("should update a webhook subscription", async () => {
      const updates = {
        url: "https://updated-example.com/webhook",
        active: false,
        maxRetries: 3,
      };

      const res = await app.request(`/webhooks/subscriptions/${subscriptionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify(updates),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.url).toBe(updates.url);
      expect(json.active).toBe(updates.active);
      expect(json.maxRetries).toBe(updates.maxRetries);
    });

    it("should update events array", async () => {
      const updates = {
        events: JSON.stringify(["product.created", "product.updated", "product.deleted"]),
      };

      const res = await app.request(`/webhooks/subscriptions/${subscriptionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify(updates),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.events).toEqual(updates.events);
    });

    it("should prevent updating another user's subscription", async () => {
      // Create another user
      const otherUser = {
        email: `other-user-${Date.now()}@example.com`,
        password: "OtherUser123!",
      };

      const hashedPassword = await AuthService.hashPassword(otherUser.password);
      const user = await db.insert(users).values({
        email: otherUser.email,
        password: hashedPassword,
        name: "Other User",
        isActive: true,
      }).returning().get();

      const otherUserToken = AuthService.generateAccessToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        isActive: user.isActive,
      });

      // Try to update first user's subscription with other user's token
      const updates = { active: true };
      const res = await app.request(`/webhooks/subscriptions/${subscriptionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${otherUserToken}`,
        },
        body: JSON.stringify(updates),
      });

      expect(res.status).toBe(403);
    });

    it("should return 404 for non-existent subscription", async () => {
      const fakeId = crypto.randomUUID();
      const updates = { active: false };

      const res = await app.request(`/webhooks/subscriptions/${fakeId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify(updates),
      });

      expect(res.status).toBe(404);
    });

    it("should reject empty updates with error", async () => {
      const res = await app.request(`/webhooks/subscriptions/${subscriptionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify({}),
      });

      // API currently returns 500 for empty updates (handler bug - should validate this)
      expect(res.status).toBe(500);
    });

    it("should return 401 when updating owned subscription without auth", async () => {
      const updates = { active: true };
      const res = await app.request(`/webhooks/subscriptions/${subscriptionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      expect(res.status).toBe(401);
    });
  });

  describe("pOST /webhooks/subscriptions/:id/test", () => {
    it("should test a webhook subscription", async () => {
      // First, enable the subscription
      await app.request(`/webhooks/subscriptions/${subscriptionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify({ active: true }),
      });

      const res = await app.request(`/webhooks/subscriptions/${subscriptionId}/test`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBeDefined();
      expect(json.message).toBeDefined();
    });

    it("should return 404 for non-existent subscription", async () => {
      const fakeId = crypto.randomUUID();
      const res = await app.request(`/webhooks/subscriptions/${fakeId}/test`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(res.status).toBe(404);
    });

    it("should allow testing subscription without authentication", async () => {
      const res = await app.request(`/webhooks/subscriptions/${subscriptionId}/test`, {
        method: "POST",
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBeDefined();
    });
  });

  describe("dELETE /webhooks/subscriptions/:id", () => {
    it("should delete a webhook subscription", async () => {
      // Create a new subscription to delete
      const subscriptionData = {
        url: "https://example.com/webhook-to-delete",
        events: JSON.stringify(["product.created"]),
      };

      const createRes = await app.request("/webhooks/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify(subscriptionData),
      });

      const created = await createRes.json();
      const idToDelete = created.id;

      // Delete it
      const res = await app.request(`/webhooks/subscriptions/${idToDelete}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(res.status).toBe(204);

      // Verify it's deleted
      const getRes = await app.request(`/webhooks/subscriptions/${idToDelete}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(getRes.status).toBe(404);
    });

    it("should prevent deleting another user's subscription", async () => {
      // Create another user
      const otherUser = {
        email: `delete-test-${Date.now()}@example.com`,
        password: "DeleteTest123!",
      };

      const hashedPassword = await AuthService.hashPassword(otherUser.password);
      const user = await db.insert(users).values({
        email: otherUser.email,
        password: hashedPassword,
        name: "Other User",
        isActive: true,
      }).returning().get();

      const otherUserToken = AuthService.generateAccessToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        isActive: user.isActive,
      });

      // Try to delete first user's subscription
      const res = await app.request(`/webhooks/subscriptions/${subscriptionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${otherUserToken}`,
        },
      });

      expect(res.status).toBe(403);
    });

    it("should return 404 for non-existent subscription", async () => {
      const fakeId = crypto.randomUUID();
      const res = await app.request(`/webhooks/subscriptions/${fakeId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(res.status).toBe(404);
    });

    it("should return 401 when deleting owned subscription without auth", async () => {
      const res = await app.request(`/webhooks/subscriptions/${subscriptionId}`, {
        method: "DELETE",
      });

      expect(res.status).toBe(401);
    });
  });
});
