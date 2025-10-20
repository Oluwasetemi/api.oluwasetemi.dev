import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import db from "@/db";
import { users } from "@/db/schema";
import env from "@/env";
import { AuthService } from "@/lib/auth";
import { createTestApp } from "@/lib/create-app";
import { pubsub, SUBSCRIPTION_EVENTS } from "@/lib/pubsub";
import { cleanupTestDatabase, setupTestDatabase } from "@/lib/test-setup";
import * as webhookService from "@/lib/webhook-service";
import { generateSlugFromTitle } from "@/utils/slug";

import router from "./posts.index";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

const app = createTestApp(router);

describe("posts API with webhooks", () => {
  let testDbPath: string;
  let postId: string;
  let userAccessToken: string;

  beforeAll(async () => {
    testDbPath = await setupTestDatabase();

    // Create test user directly in database
    const testUser = {
      email: `posts-test-${Date.now()}@example.com`,
      password: "PostsTest123!",
    };

    const hashedPassword = await AuthService.hashPassword(testUser.password);
    const user = await db.insert(users).values({
      email: testUser.email,
      password: hashedPassword,
      name: "Posts Test User",
      isActive: true,
    }).returning().get();

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

  describe("pOST /posts", () => {
    it("should create post and emit webhook event", async () => {
      const emitSpy = vi.spyOn(webhookService, "emitWebhookEvent");

      const postData = {
        title: "Test Post",
        slug: "test-post",
        content: "Test post content",
        status: "DRAFT",
      };

      const res = await app.request("/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify(postData),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBeDefined();
      expect(json.title).toBe(postData.title);
      expect(json.slug).toBe(postData.slug);

      // Verify webhook was emitted
      expect(emitSpy).toHaveBeenCalledWith("post.created", expect.objectContaining({
        title: postData.title,
        slug: postData.slug,
      }));

      postId = json.id;
      emitSpy.mockRestore();
    });

    it("should publish to GraphQL subscriptions on creation", async () => {
      const publishSpy = vi.spyOn(pubsub, "publish");

      const postData = {
        title: "Subscription Test Post",
        slug: "subscription-test-post",
        content: "Test content",
      };

      await app.request("/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify(postData),
      });

      expect(publishSpy).toHaveBeenCalledWith(
        SUBSCRIPTION_EVENTS.POST_CREATED,
        expect.objectContaining({
          postCreated: expect.objectContaining({
            title: postData.title,
            slug: postData.slug,
          }),
        }),
      );

      publishSpy.mockRestore();
    });

    it("should set author from authenticated user", async () => {
      const postData = {
        title: "Owned Post",
        slug: "owned-post",
        content: "Owned content",
      };

      const res = await app.request("/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify(postData),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.author).toBeDefined();
    });

    it("should validate required fields", async () => {
      const invalidData = {
        content: "Missing required fields",
      };

      const res = await app.request("/posts", {
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

  describe("pATCH /posts/:id", () => {
    it("should update post and emit webhook event", async () => {
      const emitSpy = vi.spyOn(webhookService, "emitWebhookEvent");

      const updates = {
        title: "Updated Post Title",
        content: "Updated content",
      };

      const res = await app.request(`/posts/${postId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify(updates),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.title).toBe(updates.title);
      expect(json.content).toBe(updates.content);

      // Verify webhook was emitted
      expect(emitSpy).toHaveBeenCalledWith("post.updated", expect.objectContaining({
        id: postId,
        title: updates.title,
        content: updates.content,
      }));

      emitSpy.mockRestore();
    });

    it("should emit publish event when status changes to PUBLISHED", async () => {
      const emitSpy = vi.spyOn(webhookService, "emitWebhookEvent");
      const publishSpy = vi.spyOn(pubsub, "publish");

      const updates = {
        status: "PUBLISHED",
      };

      const res = await app.request(`/posts/${postId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify(updates),
      });

      expect(res.status).toBe(200);

      // Verify postPublished webhook and subscription were emitted
      expect(emitSpy).toHaveBeenCalledWith("post.published", expect.objectContaining({
        id: postId,
        status: "PUBLISHED",
      }));

      expect(publishSpy).toHaveBeenCalledWith(
        SUBSCRIPTION_EVENTS.POST_PUBLISHED,
        expect.objectContaining({
          postPublished: expect.objectContaining({
            id: postId,
            status: "PUBLISHED",
          }),
        }),
      );

      emitSpy.mockRestore();
      publishSpy.mockRestore();
    });

    it("should publish to GraphQL subscriptions on update", async () => {
      const publishSpy = vi.spyOn(pubsub, "publish");

      const updates = {
        content: "Updated content again",
      };

      await app.request(`/posts/${postId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify(updates),
      });

      expect(publishSpy).toHaveBeenCalledWith(
        SUBSCRIPTION_EVENTS.POST_UPDATED,
        expect.objectContaining({
          postUpdated: expect.objectContaining({
            id: postId,
          }),
        }),
      );

      publishSpy.mockRestore();
    });

    it("should prevent updating another user's post", async () => {
      // Create another user
      const otherUser = {
        email: `other-posts-user-${Date.now()}@example.com`,
        password: "OtherUser123!",
      };

      const hashedPassword = await AuthService.hashPassword(otherUser.password);
      const user = await db.insert(users).values({
        email: otherUser.email,
        password: hashedPassword,
        name: "Other Posts User",
        isActive: true,
      }).returning().get();

      const otherUserToken = AuthService.generateAccessToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        isActive: user.isActive,
      });

      const updates = { title: "Unauthorized Update" };
      const res = await app.request(`/posts/${postId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${otherUserToken}`,
        },
        body: JSON.stringify(updates),
      });

      expect(res.status).toBe(403);
    });

    it("should return 404 for non-existent post", async () => {
      const fakeId = crypto.randomUUID();
      const updates = { title: "Update Non-existent" };

      const res = await app.request(`/posts/${fakeId}`, {
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
      const res = await app.request(`/posts/${postId}`, {
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

  describe("dELETE /posts/:id", () => {
    it("should delete post and emit webhook event", async () => {
      // Create post to delete
      const postData = {
        title: "Post to Delete",
        slug: "post-to-delete",
        content: "Delete me",
      };

      const createRes = await app.request("/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify(postData),
      });

      const created = await createRes.json();
      const idToDelete = created.id;

      const emitSpy = vi.spyOn(webhookService, "emitWebhookEvent");

      const res = await app.request(`/posts/${idToDelete}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(res.status).toBe(204);

      // Verify webhook was emitted
      expect(emitSpy).toHaveBeenCalledWith("post.deleted", { id: idToDelete });

      emitSpy.mockRestore();
    });

    it("should publish to GraphQL subscriptions on deletion", async () => {
      // Create post to delete
      const postData = {
        title: "Post for Subscription Delete",
        slug: "post-for-sub-delete",
        content: "Delete for subscription",
      };

      const createRes = await app.request("/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify(postData),
      });

      const created = await createRes.json();
      const idToDelete = created.id;

      const publishSpy = vi.spyOn(pubsub, "publish");

      await app.request(`/posts/${idToDelete}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(publishSpy).toHaveBeenCalledWith(
        SUBSCRIPTION_EVENTS.POST_DELETED,
        expect.objectContaining({
          postDeleted: { id: idToDelete },
        }),
      );

      publishSpy.mockRestore();
    });

    it("should prevent deleting another user's post", async () => {
      // Create another user
      const otherUser = {
        email: `delete-posts-test-${Date.now()}@example.com`,
        password: "DeleteTest123!",
      };

      const hashedPassword = await AuthService.hashPassword(otherUser.password);
      const user = await db.insert(users).values({
        email: otherUser.email,
        password: hashedPassword,
        name: "Delete Test User",
        isActive: true,
      }).returning().get();

      const otherUserToken = AuthService.generateAccessToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        isActive: user.isActive,
      });

      const res = await app.request(`/posts/${postId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${otherUserToken}`,
        },
      });

      expect(res.status).toBe(403);
    });

    it("should return 404 for non-existent post", async () => {
      const fakeId = crypto.randomUUID();
      const res = await app.request(`/posts/${fakeId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(res.status).toBe(404);
    });
  });

  describe("gET /posts", () => {
    it("should list posts with pagination", async () => {
      const res = await app.request("/posts?page=1&limit=10", {
        method: "GET",
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toBeDefined();
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.meta).toBeDefined();
    });

    it("should filter by status", async () => {
      const res = await app.request("/posts?status=PUBLISHED", {
        method: "GET",
      });

      expect(res.status).toBe(200);
    });

    it("should search by title and content", async () => {
      const res = await app.request("/posts?search=test", {
        method: "GET",
      });

      expect(res.status).toBe(200);
    });
  });

  describe("gET /posts/:id", () => {
    it("should get a post by id", async () => {
      const res = await app.request(`/posts/${postId}`, {
        method: "GET",
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBe(postId);
    });

    it("should return 404 for non-existent post", async () => {
      const fakeId = crypto.randomUUID();
      const res = await app.request(`/posts/${fakeId}`, {
        method: "GET",
      });

      expect(res.status).toBe(404);
    });
  });

  describe("gET /posts/slug/:slug", () => {
    it("should get a post by slug", async () => {
      // First get a post to know its slug
      const listRes = await app.request("/posts?limit=1", {
        method: "GET",
      });

      const listData = await listRes.json();
      if (listData.data && listData.data.length > 0) {
        const post = listData.data[0];

        const res = await app.request(`/posts/slug/${post.slug}`, {
          method: "GET",
        });

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.slug).toBe(post.slug);
      }
    });

    it("should return 404 for non-existent slug", async () => {
      const res = await app.request("/posts/slug/non-existent-slug-12345", {
        method: "GET",
      });

      expect(res.status).toBe(404);
    });
  });

  describe("slug Auto-generation and Fallback", () => {
    it("should auto-generate slug from title when slug not provided", async () => {
      const postData = {
        title: "My Awesome Test Post",
        content: "Test content",
      };

      const res = await app.request("/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify(postData),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.slug).toBe("my-awesome-test-post");
    });

    it("should use custom slug when provided", async () => {
      const postData = {
        title: "Another Test Post",
        slug: "custom-slug",
        content: "Test content",
      };

      const res = await app.request("/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify(postData),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.slug).toBe("custom-slug");
    });

    it("should append -1 when duplicate slug exists", async () => {
      // Use unique title for this test to avoid conflicts with other tests
      const uniqueTitle = `Duplicate Title Test ${Date.now()}`;
      const expectedBaseSlug = generateSlugFromTitle(uniqueTitle);

      // Create first post
      const postData1 = {
        title: uniqueTitle,
        content: "First content",
      };

      const res1 = await app.request("/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify(postData1),
      });

      const json1 = await res1.json();
      expect(json1.slug).toBe(expectedBaseSlug);

      // Create second post with same title
      const postData2 = {
        title: uniqueTitle,
        content: "Second content",
      };

      const res2 = await app.request("/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify(postData2),
      });

      const json2 = await res2.json();
      // Should have a numeric suffix appended (e.g., -1, -2, etc.)
      expect(json2.slug).toMatch(new RegExp(`^${expectedBaseSlug}-\\d+$`));
      expect(json2.slug).not.toBe(json1.slug); // Must be different from first post
    });

    it("should fetch post by slug via GET /posts/{id}", async () => {
      // Create a post with known slug
      const postData = {
        title: "Slug Fetch Test",
        slug: "slug-fetch-test",
        content: "Test content",
      };

      const createRes = await app.request("/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify(postData),
      });

      const createdPost = await createRes.json();

      // Fetch by slug using GET /posts/{id}
      const res = await app.request("/posts/slug-fetch-test", {
        method: "GET",
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBe(createdPost.id);
      expect(json.slug).toBe("slug-fetch-test");
    });

    it("should fetch post by UUID via GET /posts/{id}", async () => {
      // Create a post
      const postData = {
        title: "UUID Fetch Test",
        content: "Test content",
      };

      const createRes = await app.request("/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify(postData),
      });

      const createdPost = await createRes.json();

      // Fetch by UUID
      const res = await app.request(`/posts/${createdPost.id}`, {
        method: "GET",
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBe(createdPost.id);
    });

    it("should regenerate slug when title is updated without providing slug", async () => {
      // Create a post
      const postData = {
        title: "Original Title",
        content: "Test content",
      };

      const createRes = await app.request("/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify(postData),
      });

      const createdPost = await createRes.json();
      expect(createdPost.slug).toBe("original-title");

      // Update title without providing slug
      const updateRes = await app.request(`/posts/${createdPost.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify({
          title: "Updated Title",
        }),
      });

      expect(updateRes.status).toBe(200);
      const updatedPost = await updateRes.json();
      expect(updatedPost.slug).toBe("updated-title");
    });

    it("should handle special characters in title when generating slug", async () => {
      const postData = {
        title: "Test@#$ Post & Special!!! Characters???",
        content: "Test content",
      };

      const res = await app.request("/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify(postData),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.slug).toBe("test-post-special-characters");
    });
  });
});
