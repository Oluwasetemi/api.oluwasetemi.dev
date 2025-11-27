import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import db from "@/db";
import { users } from "@/db/schema";
import env from "@/env";
import { AuthService } from "@/lib/auth";
import { createTestApp } from "@/lib/create-app";
import { pubsub, SUBSCRIPTION_EVENTS } from "@/lib/pubsub";
import { cleanupTestDatabase, setupTestDatabase } from "@/lib/test-setup";
import * as webhookService from "@/lib/webhook-service";

import router from "./products.index";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

const app = createTestApp(router);

describe("products API with webhooks", () => {
  let testDbPath: string;
  let productId: string;
  let userAccessToken: string;

  beforeAll(async () => {
    testDbPath = await setupTestDatabase();

    // Create test user directly in database
    const testUser = {
      email: `products-test-${Date.now()}@example.com`,
      password: "ProductsTest123!",
    };

    const hashedPassword = await AuthService.hashPassword(testUser.password);
    const user = await db.insert(users).values({
      email: testUser.email,
      password: hashedPassword,
      name: "Products Test User",
      isActive: true,
    }).returning().get();

    userAccessToken = await AuthService.generateAccessToken({
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

  describe("pOST /products", () => {
    it("should create product and emit webhook event", async () => {
      // Spy on webhook emission
      const emitSpy = vi.spyOn(webhookService, "emitWebhookEvent");

      const productData = {
        name: "Test Product",
        description: "Test product description",
        price: 99.99,
        sku: "TEST-001",
      };

      const res = await app.request("/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify(productData),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBeDefined();
      expect(json.name).toBe(productData.name);
      expect(json.price).toBe(productData.price);

      // Verify webhook was emitted
      expect(emitSpy).toHaveBeenCalledWith("product.created", expect.objectContaining({
        name: productData.name,
        price: productData.price,
      }));

      productId = json.id;
      emitSpy.mockRestore();
    });

    it("should publish to GraphQL subscriptions on creation", async () => {
      const publishSpy = vi.spyOn(pubsub, "publish");

      const productData = {
        name: "Subscription Test Product",
        price: 49.99,
        sku: "SUB-TEST-001",
      };

      await app.request("/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify(productData),
      });

      expect(publishSpy).toHaveBeenCalledWith(
        SUBSCRIPTION_EVENTS.PRODUCT_CREATED,
        expect.objectContaining({
          productCreated: expect.objectContaining({
            name: productData.name,
            price: productData.price,
          }),
        }),
      );

      publishSpy.mockRestore();
    });

    it("should set owner from authenticated user", async () => {
      const productData = {
        name: "Owned Product",
        price: 29.99,
        sku: "OWNED-001",
      };

      const res = await app.request("/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify(productData),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.owner).toBeDefined();
    });

    it("should validate required fields", async () => {
      const invalidData = {
        description: "Missing required fields",
      };

      const res = await app.request("/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify(invalidData),
      });

      expect(res.status).toBe(422);
    });
  });

  describe("pATCH /products/:id", () => {
    it("should update product and emit webhook event", async () => {
      const emitSpy = vi.spyOn(webhookService, "emitWebhookEvent");

      const updates = {
        name: "Updated Product Name",
        price: 149.99,
      };

      const res = await app.request(`/products/${productId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify(updates),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.name).toBe(updates.name);
      expect(json.price).toBe(updates.price);

      // Verify webhook was emitted
      expect(emitSpy).toHaveBeenCalledWith("product.updated", expect.objectContaining({
        id: productId,
        name: updates.name,
        price: updates.price,
      }));

      emitSpy.mockRestore();
    });

    it("should publish to GraphQL subscriptions on update", async () => {
      const publishSpy = vi.spyOn(pubsub, "publish");

      const updates = {
        description: "Updated description",
      };

      await app.request(`/products/${productId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify(updates),
      });

      expect(publishSpy).toHaveBeenCalledWith(
        SUBSCRIPTION_EVENTS.PRODUCT_UPDATED,
        expect.objectContaining({
          productUpdated: expect.objectContaining({
            id: productId,
          }),
        }),
      );

      publishSpy.mockRestore();
    });

    it("should prevent updating another user's product", async () => {
      // Create another user
      const otherUser = {
        email: `other-products-user-${Date.now()}@example.com`,
        password: "OtherUser123!",
      };

      const hashedPassword = await AuthService.hashPassword(otherUser.password);
      const user = await db.insert(users).values({
        email: otherUser.email,
        password: hashedPassword,
        name: "Other Products User",
        isActive: true,
      }).returning().get();

      const otherUserToken = await AuthService.generateAccessToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        isActive: user.isActive,
      });

      const updates = { name: "Unauthorized Update" };
      const res = await app.request(`/products/${productId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${otherUserToken}`,
        },
        body: JSON.stringify(updates),
      });

      expect(res.status).toBe(403);
    });

    it("should return 404 for non-existent product", async () => {
      const fakeId = crypto.randomUUID();
      const updates = { name: "Update Non-existent" };

      const res = await app.request(`/products/${fakeId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify(updates),
      });

      expect(res.status).toBe(404);
    });

    it("should reject empty updates", async () => {
      const res = await app.request(`/products/${productId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(422);
    });
  });

  describe("dELETE /products/:id", () => {
    it("should delete product and emit webhook event", async () => {
      // Create product to delete
      const productData = {
        name: "Product to Delete",
        price: 19.99,
        sku: "DEL-001",
      };

      const createRes = await app.request("/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify(productData),
      });

      const created = await createRes.json();
      const idToDelete = created.id;

      const emitSpy = vi.spyOn(webhookService, "emitWebhookEvent");

      const res = await app.request(`/products/${idToDelete}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(res.status).toBe(204);

      // Verify webhook was emitted
      expect(emitSpy).toHaveBeenCalledWith("product.deleted", { id: idToDelete });

      emitSpy.mockRestore();
    });

    it("should publish to GraphQL subscriptions on deletion", async () => {
      // Create product to delete
      const productData = {
        name: "Product for Subscription Delete",
        price: 9.99,
        sku: "SUB-DEL-001",
      };

      const createRes = await app.request("/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify(productData),
      });

      const created = await createRes.json();
      const idToDelete = created.id;

      const publishSpy = vi.spyOn(pubsub, "publish");

      await app.request(`/products/${idToDelete}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(publishSpy).toHaveBeenCalledWith(
        SUBSCRIPTION_EVENTS.PRODUCT_DELETED,
        expect.objectContaining({
          productDeleted: { id: idToDelete },
        }),
      );

      publishSpy.mockRestore();
    });

    it("should prevent deleting another user's product", async () => {
      // Create another user
      const otherUser = {
        email: `delete-products-test-${Date.now()}@example.com`,
        password: "DeleteTest123!",
      };

      const hashedPassword = await AuthService.hashPassword(otherUser.password);
      const user = await db.insert(users).values({
        email: otherUser.email,
        password: hashedPassword,
        name: "Delete Test User",
        isActive: true,
      }).returning().get();

      const otherUserToken = await AuthService.generateAccessToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        isActive: user.isActive,
      });

      const res = await app.request(`/products/${productId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${otherUserToken}`,
        },
      });

      expect(res.status).toBe(403);
    });

    it("should return 404 for non-existent product", async () => {
      const fakeId = crypto.randomUUID();
      const res = await app.request(`/products/${fakeId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(res.status).toBe(404);
    });
  });

  describe("gET /products", () => {
    it("should list products with pagination", async () => {
      const res = await app.request("/products?page=1&limit=10", {
        method: "GET",
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toBeDefined();
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.meta).toBeDefined();
    });

    it("should filter by category", async () => {
      const res = await app.request("/products?category=electronics", {
        method: "GET",
      });

      expect(res.status).toBe(200);
    });

    it("should search by name and description", async () => {
      const res = await app.request("/products?search=test", {
        method: "GET",
      });

      expect(res.status).toBe(200);
    });

    it("should filter by published status", async () => {
      const res = await app.request("/products?published=true", {
        method: "GET",
      });

      expect(res.status).toBe(200);
    });
  });

  describe("gET /products/:id", () => {
    it("should get a product by id", async () => {
      const res = await app.request(`/products/${productId}`, {
        method: "GET",
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBe(productId);
    });

    it("should return 404 for non-existent product", async () => {
      const fakeId = crypto.randomUUID();
      const res = await app.request(`/products/${fakeId}`, {
        method: "GET",
      });

      expect(res.status).toBe(404);
    });
  });
});
