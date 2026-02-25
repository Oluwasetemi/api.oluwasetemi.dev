import { testClient } from "hono/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import env from "@/env";
import { createTestApp } from "@/lib/create-app";
import { cleanupTestDatabase, setupTestDatabase } from "@/lib/test-setup";

import router from "./products.index";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

const client = testClient(createTestApp(router)) as any;

describe("get /products/me", () => {
  let testDbPath: string;

  beforeAll(async () => {
    testDbPath = await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase(testDbPath);
  });

  it("returns 401 when not authenticated", async () => {
    const response = await client.products.me.$get({ query: {} });
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data).toHaveProperty("message", "Authorization token required");
  });

  describe("authenticated user products", () => {
    let userToken: string;
    let otherUserToken: string;
    let fullApp: any;

    beforeAll(async () => {
      fullApp = (await import("@/app")).default;

      const userEmail = `me-products-${Date.now()}@example.com`;
      const otherEmail = `me-products-other-${Date.now()}@example.com`;

      const registerRes = await fullApp.request("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, password: "Password123!", name: "Product User" }),
      });
      userToken = (await registerRes.json()).accessToken;

      const otherRes = await fullApp.request("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otherEmail, password: "Password123!", name: "Other User" }),
      });
      otherUserToken = (await otherRes.json()).accessToken;

      // Create 3 products for main user
      await fullApp.request("/products", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userToken}` },
        body: JSON.stringify({ name: "My Widget", price: 10, category: "widgets", sku: `SKU-${Date.now()}-1` }),
      });
      await fullApp.request("/products", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userToken}` },
        body: JSON.stringify({ name: "My Gadget", price: 20, category: "gadgets", sku: `SKU-${Date.now()}-2` }),
      });
      await fullApp.request("/products", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userToken}` },
        body: JSON.stringify({ name: "My Searchable Product", price: 30, category: "widgets", sku: `SKU-${Date.now()}-3` }),
      });

      // Create 1 product for other user — must NOT appear in /products/me
      await fullApp.request("/products", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${otherUserToken}` },
        body: JSON.stringify({ name: "Other User Product", price: 99, sku: `SKU-OTHER-${Date.now()}` }),
      });
    });

    it("returns only the authenticated user's products", async () => {
      const response = await fullApp.request("/products/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${userToken}` },
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBe(3);
      expect(data.data.every((p: any) => p.name !== "Other User Product")).toBe(true);
    });

    it("returns correct pagination meta", async () => {
      const response = await fullApp.request("/products/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${userToken}` },
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.meta).toMatchObject({ total: 3, page: 1, limit: 10, totalPages: 1, hasNextPage: false, hasPreviousPage: false });
    });

    it("filters by category", async () => {
      const response = await fullApp.request("/products/me?category=widgets", {
        method: "GET",
        headers: { Authorization: `Bearer ${userToken}` },
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.every((p: any) => p.category === "widgets")).toBe(true);
    });

    it("searches by name", async () => {
      const response = await fullApp.request("/products/me?search=Searchable", {
        method: "GET",
        headers: { Authorization: `Bearer ${userToken}` },
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.some((p: any) => p.name === "My Searchable Product")).toBe(true);
    });

    it("returns flat array when all=true", async () => {
      const response = await fullApp.request("/products/me?all=true", {
        method: "GET",
        headers: { Authorization: `Bearer ${userToken}` },
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(3);
    });

    it("paginates correctly", async () => {
      const response = await fullApp.request("/products/me?page=1&limit=2", {
        method: "GET",
        headers: { Authorization: `Bearer ${userToken}` },
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.length).toBe(2);
      expect(data.meta.hasNextPage).toBe(true);
      expect(data.meta.totalPages).toBe(2);
    });
  });
});
