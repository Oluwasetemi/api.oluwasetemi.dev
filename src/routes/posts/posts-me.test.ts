import { testClient } from "hono/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import env from "@/env";
import { createTestApp } from "@/lib/create-app";
import { cleanupTestDatabase, setupTestDatabase } from "@/lib/test-setup";

import router from "./posts.index";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

const client = testClient(createTestApp(router)) as any;

describe("get /posts/me", () => {
  let testDbPath: string;

  beforeAll(async () => {
    testDbPath = await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase(testDbPath);
  });

  it("returns 401 when not authenticated", async () => {
    const response = await client.posts.me.$get({ query: {} });
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data).toHaveProperty("message", "Authorization token required");
  });

  describe("authenticated user posts", () => {
    let userToken: string;
    let otherUserToken: string;
    let fullApp: any;

    beforeAll(async () => {
      fullApp = (await import("@/app")).default;

      const userEmail = `me-posts-${Date.now()}@example.com`;
      const otherEmail = `me-posts-other-${Date.now()}@example.com`;

      const registerRes = await fullApp.request("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, password: "Password123!", name: "Post User" }),
      });
      userToken = (await registerRes.json()).accessToken;

      const otherRes = await fullApp.request("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otherEmail, password: "Password123!", name: "Other User" }),
      });
      otherUserToken = (await otherRes.json()).accessToken;

      // Create posts for main user
      await fullApp.request("/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userToken}` },
        body: JSON.stringify({ title: "My Draft Post", content: "Content", status: "DRAFT" }),
      });
      await fullApp.request("/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userToken}` },
        body: JSON.stringify({ title: "My Published Post", content: "Content", status: "PUBLISHED" }),
      });
      await fullApp.request("/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userToken}` },
        body: JSON.stringify({ title: "My Searchable Post", content: "unique-search-term content", status: "DRAFT" }),
      });

      // Create a post for the other user — must NOT appear in /posts/me
      await fullApp.request("/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${otherUserToken}` },
        body: JSON.stringify({ title: "Other User Post", content: "Content", status: "PUBLISHED" }),
      });
    });

    it("returns only the authenticated user's posts", async () => {
      const response = await fullApp.request("/posts/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${userToken}` },
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBe(3);
      expect(data.data.every((p: any) => p.title !== "Other User Post")).toBe(true);
    });

    it("returns correct pagination meta", async () => {
      const response = await fullApp.request("/posts/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${userToken}` },
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.meta).toMatchObject({ total: 3, page: 1, limit: 10, totalPages: 1, hasNextPage: false, hasPreviousPage: false });
    });

    it("filters by status", async () => {
      const response = await fullApp.request("/posts/me?status=DRAFT", {
        method: "GET",
        headers: { Authorization: `Bearer ${userToken}` },
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.length).toBe(2);
      expect(data.data.every((p: any) => p.status === "DRAFT")).toBe(true);
    });

    it("searches by title and content", async () => {
      const response = await fullApp.request("/posts/me?search=unique-search-term", {
        method: "GET",
        headers: { Authorization: `Bearer ${userToken}` },
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.some((p: any) => p.title === "My Searchable Post")).toBe(true);
    });

    it("returns flat array when all=true", async () => {
      const response = await fullApp.request("/posts/me?all=true", {
        method: "GET",
        headers: { Authorization: `Bearer ${userToken}` },
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(3);
    });

    it("paginates correctly", async () => {
      const response = await fullApp.request("/posts/me?page=1&limit=2", {
        method: "GET",
        headers: { Authorization: `Bearer ${userToken}` },
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.length).toBe(2);
      expect(data.meta.hasNextPage).toBe(true);
      expect(data.meta.hasPreviousPage).toBe(false);
      expect(data.meta.totalPages).toBe(2);
    });

    it("returns correct meta for second page", async () => {
      const response = await fullApp.request("/posts/me?page=2&limit=2", {
        method: "GET",
        headers: { Authorization: `Bearer ${userToken}` },
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.length).toBe(1);
      expect(data.meta.hasNextPage).toBe(false);
      expect(data.meta.hasPreviousPage).toBe(true);
    });
  });
});
