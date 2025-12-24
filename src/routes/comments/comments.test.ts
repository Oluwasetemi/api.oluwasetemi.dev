import * as HttpStatusPhrases from "stoker/http-status-phrases";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";

import env from "@/env";
import { ZOD_ERROR_MESSAGES } from "@/lib/constants";
import { cleanupTestDatabase, setupTestDatabase } from "@/lib/test-setup";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

describe("comments routes", () => {
  let testDbPath: string;
  let fullApp: any;
  let testPostId: string;
  let testCommentId: string;
  let userToken: string;

  beforeAll(async () => {
    testDbPath = await setupTestDatabase();
    fullApp = (await import("@/app")).default;

    // Register a test user and get token
    const userEmail = `commenter-${Date.now()}@example.com`;
    const userRegisterResponse = await fullApp.request("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: userEmail,
        password: "Password123!",
        name: "Test Commenter",
      }),
    });
    const userData = await userRegisterResponse.json();
    userToken = userData.accessToken;

    // Create a test post for comments
    const postResponse = await fullApp.request("/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        title: "Test Post for Comments",
        slug: `test-post-${Date.now()}`,
        content: "This is a test post for testing comments",
        status: "PUBLISHED",
      }),
    });

    if (postResponse.status !== 200) {
      const errorData = await postResponse.json();
      throw new Error(`Failed to create test post: ${JSON.stringify(errorData)}`);
    }

    const postData = await postResponse.json();
    testPostId = postData.id;

    if (!testPostId) {
      throw new Error("Test post ID is undefined");
    }
  });

  afterAll(async () => {
    await cleanupTestDatabase(testDbPath);
  });

  describe("pOST /posts/{postId}/comments", () => {
    it("validates post existence", async () => {
      const fakePostId = crypto.randomUUID();
      const response = await fullApp.request(`/posts/${fakePostId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "This should fail",
          authorName: "Anonymous User",
        }),
      });

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.message).toBe("Post not found");
    });

    it("validates required fields for anonymous comments", async () => {
      const response = await fullApp.request(`/posts/${testPostId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "Missing authorName",
        }),
      });

      expect(response.status).toBe(422);
      const json = await response.json();
      expect(json.error.issues[0].path).toContain("authorName");
    });

    it("validates content length", async () => {
      const response = await fullApp.request(`/posts/${testPostId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "",
          authorName: "Test User",
        }),
      });

      expect(response.status).toBe(422);
      const json = await response.json();
      expect(json.error.issues[0].path).toContain("content");
    });

    it("validates email format when provided", async () => {
      const response = await fullApp.request(`/posts/${testPostId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "Test comment",
          authorName: "Test User",
          authorEmail: "invalid-email",
        }),
      });

      expect(response.status).toBe(422);
      const json = await response.json();
      expect(json.error.issues[0].path).toContain("authorEmail");
    });

    it("creates anonymous comment successfully", async () => {
      const response = await fullApp.request(`/posts/${testPostId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "This is an anonymous comment",
          authorName: "Anonymous User",
          authorEmail: "anon@example.com",
        }),
      });

      expect(response.status).toBe(200);
      const comment = await response.json();
      expect(comment.content).toBe("This is an anonymous comment");
      expect(comment.authorName).toBe("Anonymous User");
      expect(comment.authorEmail).toBe("anon@example.com");
      expect(comment.authorId).toBeNull();
      expect(comment.postId).toBe(testPostId);
    });

    it("creates authenticated comment with user data", async () => {
      const response = await fullApp.request(`/posts/${testPostId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          content: "This is an authenticated comment",
          authorName: "Should be overridden",
        }),
      });

      expect(response.status).toBe(200);
      const comment = await response.json();
      testCommentId = comment.id;
      expect(comment.content).toBe("This is an authenticated comment");
      expect(comment.authorName).toBe("Test Commenter"); // From user profile
      expect(comment.authorId).toBeDefined();
      expect(comment.isEdited).toBe(false);
      expect(comment.editedAt).toBeNull();
    });
  });

  describe("gET /posts/{postId}/comments", () => {
    beforeAll(async () => {
      // Create a few more comments for testing
      for (let i = 0; i < 5; i++) {
        await fullApp.request(`/posts/${testPostId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `Comment ${i + 1}`,
            authorName: `User ${i + 1}`,
          }),
        });
      }
    });

    it("validates post existence", async () => {
      const fakePostId = crypto.randomUUID();
      const response = await fullApp.request(`/posts/${fakePostId}/comments`, {
        method: "GET",
      });

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.message).toBe("Post not found");
    });

    it("lists all comments when all=true", async () => {
      const response = await fullApp.request(`/posts/${testPostId}/comments?all=true`, {
        method: "GET",
      });

      expect(response.status).toBe(200);
      const comments = await response.json();
      expect(Array.isArray(comments)).toBe(true);
      expect(comments.length).toBeGreaterThan(0);
    });

    it("returns paginated comments by default", async () => {
      const response = await fullApp.request(`/posts/${testPostId}/comments`, {
        method: "GET",
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data).toBeDefined();
      expect(result.meta).toBeDefined();
      expect(result.meta.total).toBeGreaterThan(0);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });

    it("supports pagination parameters", async () => {
      const response = await fullApp.request(`/posts/${testPostId}/comments?page=1&limit=2`, {
        method: "GET",
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data.length).toBeLessThanOrEqual(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(2);
    });

    it("sorts comments by createdAt ascending", async () => {
      const response = await fullApp.request(`/posts/${testPostId}/comments?all=true&sort=ASC`, {
        method: "GET",
      });

      expect(response.status).toBe(200);
      const comments = await response.json();
      const dates = comments.map((c: any) => new Date(c.createdAt).getTime());
      expect(dates).toEqual([...dates].sort((a, b) => a - b));
    });

    it("sorts comments by createdAt descending", async () => {
      const response = await fullApp.request(`/posts/${testPostId}/comments?all=true&sort=DESC`, {
        method: "GET",
      });

      expect(response.status).toBe(200);
      const comments = await response.json();
      const dates = comments.map((c: any) => new Date(c.createdAt).getTime());
      expect(dates).toEqual([...dates].sort((a, b) => b - a));
    });
  });

  describe("gET /comments/{id}", () => {
    it("validates UUID format", async () => {
      const response = await fullApp.request("/comments/invalid-uuid", {
        method: "GET",
      });

      expect(response.status).toBe(422);
      const json = await response.json();
      expect(json.error.issues[0].path).toContain("id");
      expect(json.error.issues[0].message).toBe(ZOD_ERROR_MESSAGES.INVALID_UUID);
    });

    it("returns 404 for non-existent comment", async () => {
      const fakeId = crypto.randomUUID();
      const response = await fullApp.request(`/comments/${fakeId}`, {
        method: "GET",
      });

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.message).toBe(HttpStatusPhrases.NOT_FOUND);
    });

    it("retrieves comment successfully", async () => {
      const response = await fullApp.request(`/comments/${testCommentId}`, {
        method: "GET",
      });

      expect(response.status).toBe(200);
      const comment = await response.json();
      expect(comment.id).toBe(testCommentId);
      expect(comment.content).toBeDefined();
    });
  });

  describe("pATCH /comments/{id}", () => {
    let ownedCommentId: string;
    let anonymousCommentId: string;
    let user2Token: string;

    beforeAll(async () => {
      // Create comment owned by user
      const ownedResponse = await fullApp.request(`/posts/${testPostId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          content: "Comment to be edited",
          authorName: "Test User",
        }),
      });
      const ownedData = await ownedResponse.json();
      ownedCommentId = ownedData.id;

      // Create anonymous comment
      const anonResponse = await fullApp.request(`/posts/${testPostId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "Anonymous comment",
          authorName: "Anonymous",
        }),
      });
      const anonData = await anonResponse.json();
      anonymousCommentId = anonData.id;

      // Register second user
      const user2Email = `user2-${Date.now()}@example.com`;
      const user2RegisterResponse = await fullApp.request("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user2Email,
          password: "Password123!",
          name: "User Two",
        }),
      });
      const user2Data = await user2RegisterResponse.json();
      user2Token = user2Data.accessToken;
    });

    it("requires authentication", async () => {
      const response = await fullApp.request(`/comments/${ownedCommentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "Updated content",
        }),
      });

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.message).toBe("Authentication required to update comments");
    });

    it("prevents updating anonymous comments even with auth", async () => {
      const response = await fullApp.request(`/comments/${anonymousCommentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          content: "Trying to edit anonymous comment",
        }),
      });

      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.message).toBe("You can only update your own comments");
    });

    it("prevents non-owner from updating comment", async () => {
      const response = await fullApp.request(`/comments/${ownedCommentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user2Token}`,
        },
        body: JSON.stringify({
          content: "User 2 trying to edit",
        }),
      });

      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.message).toBe("You can only update your own comments");
    });

    it("allows owner to update their comment", async () => {
      const response = await fullApp.request(`/comments/${ownedCommentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          content: "Successfully updated content",
        }),
      });

      expect(response.status).toBe(200);
      const comment = await response.json();
      expect(comment.content).toBe("Successfully updated content");
      expect(comment.isEdited).toBe(true);
      expect(comment.editedAt).toBeDefined();
    });

    it("validates content on update", async () => {
      const response = await fullApp.request(`/comments/${ownedCommentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          content: "",
        }),
      });

      expect(response.status).toBe(422);
    });

    it("returns 404 for non-existent comment", async () => {
      const fakeId = crypto.randomUUID();
      const response = await fullApp.request(`/comments/${fakeId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          content: "Update attempt",
        }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe("dELETE /comments/{id}", () => {
    let ownedDeleteCommentId: string;
    let anonymousDeleteCommentId: string;
    let user2Token: string;

    beforeAll(async () => {
      // Create comment owned by user
      const ownedResponse = await fullApp.request(`/posts/${testPostId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          content: "Comment to be deleted",
          authorName: "Test User",
        }),
      });
      const ownedData = await ownedResponse.json();
      ownedDeleteCommentId = ownedData.id;

      // Create anonymous comment
      const anonResponse = await fullApp.request(`/posts/${testPostId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "Anonymous comment to delete",
          authorName: "Anonymous",
        }),
      });
      const anonData = await anonResponse.json();
      anonymousDeleteCommentId = anonData.id;

      // Register second user if not already done
      if (!user2Token) {
        const user2Email = `user2-delete-${Date.now()}@example.com`;
        const user2RegisterResponse = await fullApp.request("/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user2Email,
            password: "Password123!",
            name: "User Two",
          }),
        });
        const user2Data = await user2RegisterResponse.json();
        user2Token = user2Data.accessToken;
      }
    });

    it("requires authentication", async () => {
      const response = await fullApp.request(`/comments/${ownedDeleteCommentId}`, {
        method: "DELETE",
      });

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.message).toBe("Authentication required to delete comments");
    });

    it("prevents deleting anonymous comments even with auth", async () => {
      const response = await fullApp.request(`/comments/${anonymousDeleteCommentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.message).toBe("You can only delete your own comments");
    });

    it("prevents non-owner from deleting comment", async () => {
      const response = await fullApp.request(`/comments/${ownedDeleteCommentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${user2Token}`,
        },
      });

      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.message).toBe("You can only delete your own comments");
    });

    it("allows owner to delete their comment", async () => {
      const response = await fullApp.request(`/comments/${ownedDeleteCommentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.status).toBe(204);

      // Verify comment is deleted
      const getResponse = await fullApp.request(`/comments/${ownedDeleteCommentId}`, {
        method: "GET",
      });
      expect(getResponse.status).toBe(404);
    });

    it("returns 404 for non-existent comment", async () => {
      const fakeId = crypto.randomUUID();
      const response = await fullApp.request(`/comments/${fakeId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.status).toBe(404);
    });
  });

  describe("edge cases", () => {
    it("handles invalid bearer token gracefully for creation", async () => {
      const response = await fullApp.request(`/posts/${testPostId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer invalid-token",
        },
        body: JSON.stringify({
          content: "Comment with invalid token",
          authorName: "Anonymous Fallback",
        }),
      });

      // Should create anonymous comment (optional auth fails gracefully)
      expect(response.status).toBe(200);
      const comment = await response.json();
      expect(comment.authorId).toBeNull();
    });

    it("validates postId UUID format", async () => {
      const response = await fullApp.request("/posts/invalid-uuid/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "Test",
          authorName: "Test",
        }),
      });

      expect(response.status).toBe(422);
    });

    it("handles very long content within limits", async () => {
      const longContent = "a".repeat(9999); // Just under 10000 limit
      const response = await fullApp.request(`/posts/${testPostId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: longContent,
          authorName: "Long Content User",
        }),
      });

      expect(response.status).toBe(200);
    });

    it("rejects content exceeding max length", async () => {
      const tooLongContent = "a".repeat(10001);
      const response = await fullApp.request(`/posts/${testPostId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: tooLongContent,
          authorName: "Test",
        }),
      });

      expect(response.status).toBe(422);
    });
  });
});
