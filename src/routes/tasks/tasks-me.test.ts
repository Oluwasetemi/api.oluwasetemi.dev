import { testClient } from "hono/testing";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";

import env from "@/env";
import { createTestApp } from "@/lib/create-app";
import { cleanupTestDatabase, setupTestDatabase } from "@/lib/test-setup";

import router from "./tasks.index";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

const client = testClient(createTestApp(router)) as any;

describe("get /tasks/me", () => {
  let testDbPath: string;

  beforeAll(async () => {
    testDbPath = await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase(testDbPath);
  });

  it("returns 401 when not authenticated", async () => {
    const response = await client.tasks.me.$get({
      query: {},
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data).toHaveProperty("message", "Authorization token required");
  });

  describe("authenticated user tasks", () => {
    let userToken: string;
    let otherUserToken: string;
    let fullApp: any;

    beforeAll(async () => {
      fullApp = (await import("@/app")).default;

      const userEmail = `me-user-${Date.now()}@example.com`;
      const otherEmail = `me-other-${Date.now()}@example.com`;

      // Register main user
      const registerRes = await fullApp.request("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          password: "Password123!",
          name: "Me User",
        }),
      });
      const userData = await registerRes.json();
      userToken = userData.accessToken;

      // Register other user
      const otherRegisterRes = await fullApp.request("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: otherEmail,
          password: "Password123!",
          name: "Other User",
        }),
      });
      const otherUserData = await otherRegisterRes.json();
      otherUserToken = otherUserData.accessToken;

      // Create tasks for main user with varied statuses and priorities
      await fullApp.request("/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`,
        },
        body: JSON.stringify({ name: "My TODO Task", status: "TODO", priority: "HIGH" }),
      });

      await fullApp.request("/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`,
        },
        body: JSON.stringify({ name: "My DONE Task", status: "DONE", priority: "LOW" }),
      });

      await fullApp.request("/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          name: "My Searchable Task",
          status: "IN_PROGRESS",
          priority: "MEDIUM",
          description: "unique-search-term",
        }),
      });

      // Create a task for the other user — must NOT appear in /tasks/me for main user
      await fullApp.request("/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${otherUserToken}`,
        },
        body: JSON.stringify({ name: "Other User Task", status: "TODO" }),
      });
    });

    it("returns only the authenticated user's tasks", async () => {
      const response = await fullApp.request("/tasks/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("data");
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBe(3);
      expect(data.data.every((t: any) => t.name !== "Other User Task")).toBe(true);
    });

    it("returns meta with pagination info", async () => {
      const response = await fullApp.request("/tasks/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("meta");
      expect(data.meta).toMatchObject({
        total: 3,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it("filters by status", async () => {
      const response = await fullApp.request("/tasks/me?status=TODO", {
        method: "GET",
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.length).toBeGreaterThan(0);
      expect(data.data.every((t: any) => t.status === "TODO")).toBe(true);
    });

    it("filters by priority", async () => {
      const response = await fullApp.request("/tasks/me?priority=HIGH", {
        method: "GET",
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.length).toBeGreaterThan(0);
      expect(data.data.every((t: any) => t.priority === "HIGH")).toBe(true);
    });

    it("searches by name and description", async () => {
      const response = await fullApp.request("/tasks/me?search=unique-search-term", {
        method: "GET",
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.length).toBeGreaterThan(0);
      expect(data.data.some((t: any) => t.name === "My Searchable Task")).toBe(true);
    });

    it("returns a flat array when all=true", async () => {
      const response = await fullApp.request("/tasks/me?all=true", {
        method: "GET",
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(3);
    });

    it("paginates with page and limit", async () => {
      const response = await fullApp.request("/tasks/me?page=1&limit=2", {
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
      const response = await fullApp.request("/tasks/me?page=2&limit=2", {
        method: "GET",
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.length).toBe(1);
      expect(data.meta.hasNextPage).toBe(false);
      expect(data.meta.hasPreviousPage).toBe(true);
    });

    it("sorts by createdAt in ascending order", async () => {
      const response = await fullApp.request("/tasks/me?sort=ASC&all=true", {
        method: "GET",
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      const dates = data.map((t: any) => new Date(t.createdAt).getTime());
      expect(dates).toEqual([...dates].sort((a, b) => a - b));
    });

    it("sorts by createdAt in descending order by default", async () => {
      const response = await fullApp.request("/tasks/me?all=true", {
        method: "GET",
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      const dates = data.map((t: any) => new Date(t.createdAt).getTime());
      expect(dates).toEqual([...dates].sort((a, b) => b - a));
    });

    it("combines status, priority, search, and sort filters", async () => {
      const response = await fullApp.request("/tasks/me?status=TODO&priority=HIGH&sort=ASC&all=true", {
        method: "GET",
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.every((t: any) => t.status === "TODO" && t.priority === "HIGH")).toBe(true);
    });
  });
});
