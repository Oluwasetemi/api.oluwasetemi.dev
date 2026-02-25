import { afterAll, beforeAll, describe, expect, it } from "vitest";

import env from "@/env";
import { cleanupTestDatabase, setupTestDatabase } from "@/lib/test-setup";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

describe("get /posts/:postId/comments/me", () => {
  let testDbPath: string;
  let userToken: string;
  let otherUserToken: string;
  let postId: string;
  let fullApp: any;

  beforeAll(async () => {
    testDbPath = await setupTestDatabase();
    fullApp = (await import("@/app")).default;

    const userEmail = `me-comments-${Date.now()}@example.com`;
    const otherEmail = `me-comments-other-${Date.now()}@example.com`;

    const registerRes = await fullApp.request("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail, password: "Password123!", name: "Comment User" }),
    });
    userToken = (await registerRes.json()).accessToken;

    const otherRes = await fullApp.request("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: otherEmail, password: "Password123!", name: "Other User" }),
    });
    otherUserToken = (await otherRes.json()).accessToken;

    // Create a post to comment on
    const postRes = await fullApp.request("/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userToken}` },
      body: JSON.stringify({ title: "Post for comments", content: "Content", status: "PUBLISHED" }),
    });
    postId = (await postRes.json()).id;

    // Create 2 comments by main user
    await fullApp.request(`/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userToken}` },
      body: JSON.stringify({ content: "My first comment", authorName: "Comment User" }),
    });
    await fullApp.request(`/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userToken}` },
      body: JSON.stringify({ content: "My second comment", authorName: "Comment User" }),
    });

    // Create 1 comment by other user — must NOT appear in /comments/me
    await fullApp.request(`/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${otherUserToken}` },
      body: JSON.stringify({ content: "Other user comment", authorName: "Other User" }),
    });
  });

  afterAll(async () => {
    await cleanupTestDatabase(testDbPath);
  });

  it("returns 401 when not authenticated", async () => {
    const response = await fullApp.request(`/posts/${postId}/comments/me`, {
      method: "GET",
    });
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data).toHaveProperty("message", "Authorization token required");
  });

  it("returns 404 for a non-existent post", async () => {
    const fakeId = crypto.randomUUID();
    const response = await fullApp.request(`/posts/${fakeId}/comments/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(response.status).toBe(404);
  });

  it("returns only the authenticated user's comments on the post", async () => {
    const response = await fullApp.request(`/posts/${postId}/comments/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBe(2);
    expect(data.data.every((c: any) => c.content !== "Other user comment")).toBe(true);
  });

  it("returns correct pagination meta", async () => {
    const response = await fullApp.request(`/posts/${postId}/comments/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.meta).toMatchObject({ total: 2, page: 1, hasNextPage: false, hasPreviousPage: false });
  });

  it("returns flat array when all=true", async () => {
    const response = await fullApp.request(`/posts/${postId}/comments/me?all=true`, {
      method: "GET",
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(2);
  });

  it("paginates correctly", async () => {
    const response = await fullApp.request(`/posts/${postId}/comments/me?page=1&limit=1`, {
      method: "GET",
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.length).toBe(1);
    expect(data.meta.hasNextPage).toBe(true);
    expect(data.meta.totalPages).toBe(2);
  });

  it("returns correct meta for second page", async () => {
    const response = await fullApp.request(`/posts/${postId}/comments/me?page=2&limit=1`, {
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
