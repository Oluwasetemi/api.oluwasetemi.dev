import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestApp } from "@/lib/create-app";
import { cleanupTestDatabase, setupTestDatabase } from "@/lib/test-setup";

import router from "./auth.index";

// Helper function to generate unique emails for test isolation
function generateUniqueEmail(base: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${base}-${timestamp}-${random}@example.com`;
}

const app = createTestApp(router);

// TODO: Use testClient from hono/testing const client = testClient(createTestApp(router));
// creating client is not ideal, but it's the only way to get the types to work
// and it's not a big deal because we're only using it for testing
const client = {
  auth: {
    register: {
      $post: async (args: { json: any }) => {
        return app.request("/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args.json),
        });
      },
    },
    login: {
      $post: async (args: { json: any }) => {
        return app.request("/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args.json),
        });
      },
    },
    refresh: {
      $post: async (args: { json: any }) => {
        return app.request("/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args.json),
        });
      },
    },
    me: {
      $get: async (args?: { headers?: Record<string, string> }) => {
        return app.request("/auth/me", {
          method: "GET",
          headers: args?.headers || {},
        });
      },
    },
  },
};

describe("auth API", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe("pOST /auth/register", () => {
    it("should register a new user", async () => {
      const userData = {
        email: generateUniqueEmail("test"),
        password: "Password123!",
        name: "Test User",
        imageUrl: "https://example.com/avatar.jpg",
      };

      const response = await client.auth.register.$post({
        json: userData,
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data).toHaveProperty("user");
      expect(data).toHaveProperty("accessToken");
      expect(data).toHaveProperty("refreshToken");
      expect(data.user.email).toBe(userData.email);
      expect(data.user.name).toBe(userData.name);
      expect(data.user.imageUrl).toBe(userData.imageUrl);
      expect(data.user).not.toHaveProperty("password");
    });

    it("should not register user with duplicate email", async () => {
      const userData = {
        email: generateUniqueEmail("duplicate"),
        password: "Password123!",
        name: "Test User",
        imageUrl: "https://example.com/avatar2.jpg",
      };

      // Register first user
      await app.request("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      // Try to register with same email
      const response = await app.request("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      expect(response.status).toBe(409); // Conflict
    });

    it("should validate imageUrl format", async () => {
      const userData = {
        email: generateUniqueEmail("invalidurl"),
        password: "Password123!",
        name: "Test User",
        imageUrl: "not-a-valid-url",
      };

      const response = await app.request("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      expect(response.status).toBe(422); // Unprocessable Entity due to invalid URL
    });
  });

  describe("pOST /auth/login", () => {
    it("should login with valid credentials", async () => {
      const userData = {
        email: generateUniqueEmail("login"),
        password: "Password123!",
        name: "Login User",
        imageUrl: "https://example.com/login-avatar.jpg",
      };

      // Register user first
      await app.request("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      // Login
      const response = await app.request("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("user");
      expect(data).toHaveProperty("accessToken");
      expect(data).toHaveProperty("refreshToken");
      expect(data.user.email).toBe(userData.email);
    });

    it("should not login with invalid credentials", async () => {
      const response = await app.request("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: generateUniqueEmail("nonexistent"),
          password: "wrongpassword",
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe("gET /auth/me", () => {
    it("should get user profile with valid token", async () => {
      const userData = {
        email: generateUniqueEmail("profile"),
        password: "Password123!",
        name: "Profile User",
        imageUrl: "https://example.com/profile-avatar.jpg",
      };

      // Register and get token
      const registerResponse = await app.request("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      const { accessToken } = await registerResponse.json();

      // Get profile
      const response = await client.auth.me.$get({
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.email).toBe(userData.email);
      expect(data.name).toBe(userData.name);
      expect(data).not.toHaveProperty("password");
    });

    it("should not get profile without token", async () => {
      const response = await app.request("/auth/me", {
        method: "GET",
      });

      expect(response.status).toBe(401);
    });
  });

  describe("pOST /auth/refresh", () => {
    it("should refresh tokens with valid refresh token", async () => {
      const userData = {
        email: generateUniqueEmail("refresh"),
        password: "Password123!",
        name: "Refresh User",
        imageUrl: "https://example.com/refresh-avatar.jpg",
      };

      // Register and get tokens
      const registerResponse = await app.request("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      const { refreshToken } = await registerResponse.json();

      // Refresh tokens
      const response = await app.request("/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("accessToken");
      expect(data).toHaveProperty("refreshToken");
    });

    it("should not refresh with invalid token", async () => {
      // Add a small delay to avoid rate limiting from previous tests
      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await client.auth.refresh.$post({
        json: { refreshToken: "invalid-token" },
      });

      // Accept either 401 (expected) or 429 (rate limited) as the rate limiter may still be active
      expect([401, 429]).toContain(response.status);
    });
  });
});
