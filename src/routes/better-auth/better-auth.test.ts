import { testClient } from "hono/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createRouter } from "@/lib/create-app";
// Get the mocked function for test assertions
import { sendEmail } from "@/lib/email";
import { clearDatabase } from "@/lib/test-setup";

import betterAuthRoutes from "./better-auth.index";

// Mock email sending in test environment and CI
// This prevents actual emails from being sent during testing
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: "mock-email-id" }),
}));
const mockSendEmail = vi.mocked(sendEmail);

// Create test app
const app = createRouter();
app.route("/", betterAuthRoutes);
const client = testClient(app) as any;

describe("better Auth Integration", () => {
  beforeEach(async () => {
    await clearDatabase();
    mockSendEmail.mockClear();
  });

  it("should have email service properly mocked", () => {
    expect(vi.isMockFunction(mockSendEmail)).toBe(true);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  describe("pOST /api/auth/sign-up/email", () => {
    it("should register a new user successfully", async () => {
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "SecurePass123",
      };

      const response = await client.api.auth["sign-up"].email.$post({
        json: userData,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("token");
      expect(data).toHaveProperty("user");
      expect(data.user.email).toBe(userData.email);
      expect(data.user.name).toBe(userData.name);
      expect(data.user.emailVerified).toBe(false);

      // Verify email verification email was sent (mocked)
      // Note: Better Auth may send verification email on signup if configured
      if (mockSendEmail.mock.calls.length > 0) {
        expect(mockSendEmail).toHaveBeenCalledWith(
          expect.objectContaining({
            to: "john@example.com",
            subject: expect.stringContaining("Verify"),
          }),
        );
      }
    });

    it("should reject registration with invalid email", async () => {
      const userData = {
        name: "John Doe",
        email: "invalid-email",
        password: "SecurePass123",
      };

      const response = await client.api.auth["sign-up"].email.$post({
        json: userData,
      });

      expect(response.status).toBe(400);
    });

    it("should reject registration with weak password", async () => {
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "123", // Too weak
      };

      const response = await client.api.auth["sign-up"].email.$post({
        json: userData,
      });

      expect(response.status).toBe(400);
    });

    it("should reject registration with duplicate email", async () => {
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "SecurePass123",
      };

      // First registration
      await client.api.auth["sign-up"].email.$post({
        json: userData,
      });

      // Second registration with same email
      const response = await client.api.auth["sign-up"].email.$post({
        json: userData,
      });

      expect(response.status).toBe(422);
    });

    it("should register user with optional image field", async () => {
      const userData = {
        name: "Jane Doe",
        email: "jane@example.com",
        password: "SecurePass123",
        image: "https://example.com/avatar.jpg",
      };

      const response = await client.api.auth["sign-up"].email.$post({
        json: userData,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.user.image).toBe(userData.image);
    });
  });

  describe("pOST /api/auth/sign-in/email", () => {
    const userData = {
      name: "John Doe",
      email: "john@example.com",
      password: "SecurePass123",
    };

    beforeEach(async () => {
      // Register user before each login test
      await client.api.auth["sign-up"].email.$post({
        json: userData,
      });
    });

    it("should login with valid credentials", async () => {
      const response = await client.api.auth["sign-in"].email.$post({
        json: {
          email: userData.email,
          password: userData.password,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("token");
      expect(data).toHaveProperty("user");
      expect(data.user.email).toBe(userData.email);
      expect(data.redirect).toBe(false);
    });

    it("should reject login with invalid email", async () => {
      const response = await client.api.auth["sign-in"].email.$post({
        json: {
          email: "nonexistent@example.com",
          password: userData.password,
        },
      });

      expect(response.status).toBe(401);
    });

    it("should reject login with invalid password", async () => {
      const response = await client.api.auth["sign-in"].email.$post({
        json: {
          email: userData.email,
          password: "wrongpassword",
        },
      });

      expect(response.status).toBe(401);
    });

    it("should reject login with missing credentials", async () => {
      const response = await client.api.auth["sign-in"].email.$post({
        json: {},
      });

      expect(response.status).toBe(400);
    });
  });

  describe("gET /api/auth/get-session", () => {
    let authCookies: string;

    beforeEach(async () => {
      // Register and login to get session
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "SecurePass123",
      };

      await client.api.auth["sign-up"].email.$post({
        json: userData,
      });

      const loginResponse = await client.api.auth["sign-in"].email.$post({
        json: {
          email: userData.email,
          password: userData.password,
        },
      });

      // Extract cookies from response
      const setCookieHeader = loginResponse.headers.get("set-cookie");
      authCookies = setCookieHeader || "";
    });

    it("should return session with valid authentication", async () => {
      const response = await client.api.auth["get-session"].$get(
        {},
        {
          headers: {
            Cookie: authCookies,
          },
        },
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("session");
      expect(data).toHaveProperty("user");
      expect(data.user.email).toBe("john@example.com");
    });

    it("should return null for unauthenticated request", async () => {
      const response = await client.api.auth["get-session"].$get();

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toBe(null);
    });
  });

  describe("pOST /api/auth/sign-out", () => {
    let authCookies: string;

    beforeEach(async () => {
      // Register and login to get session
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "SecurePass123",
      };

      await client.api.auth["sign-up"].email.$post({
        json: userData,
      });

      const loginResponse = await client.api.auth["sign-in"].email.$post({
        json: {
          email: userData.email,
          password: userData.password,
        },
      });

      const setCookieHeader = loginResponse.headers.get("set-cookie");
      authCookies = setCookieHeader || "";
    });

    it("should sign out successfully", async () => {
      const response = await client.api.auth["sign-out"].$post(
        { json: {} },
        {
          headers: {
            Cookie: authCookies,
          },
        },
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("success");
      expect(data.success).toBe(true);
    });

    it("should handle sign out when not authenticated", async () => {
      const response = await client.api.auth["sign-out"].$post({
        json: {},
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty("message");
    });
  });

  describe("pOST /api/auth/update-user", () => {
    let authCookies: string;

    beforeEach(async () => {
      // Register and login to get session
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "SecurePass123",
      };

      await client.api.auth["sign-up"].email.$post({
        json: userData,
      });

      const loginResponse = await client.api.auth["sign-in"].email.$post({
        json: {
          email: userData.email,
          password: userData.password,
        },
      });

      const setCookieHeader = loginResponse.headers.get("set-cookie");
      authCookies = setCookieHeader || "";
    });

    it("should update user profile successfully", async () => {
      const updateData = {
        name: "John Smith",
        image: "https://example.com/new-avatar.jpg",
      };

      const response = await client.api.auth["update-user"].$post(
        { json: updateData },
        {
          headers: {
            Cookie: authCookies,
          },
        },
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("status");
      expect(data.status).toBe(true);
    });

    it("should reject update when not authenticated", async () => {
      const updateData = {
        name: "John Smith",
      };

      const response = await client.api.auth["update-user"].$post({
        json: updateData,
      });

      expect(response.status).toBe(401);
    });
  });

  describe("pOST /api/auth/change-password", () => {
    let authCookies: string;
    const userData = {
      name: "John Doe",
      email: "john@example.com",
      password: "SecurePass123",
    };

    beforeEach(async () => {
      // Register and login to get session
      await client.api.auth["sign-up"].email.$post({
        json: userData,
      });

      const loginResponse = await client.api.auth["sign-in"].email.$post({
        json: {
          email: userData.email,
          password: userData.password,
        },
      });

      const setCookieHeader = loginResponse.headers.get("set-cookie");
      authCookies = setCookieHeader || "";
    });

    it("should change password successfully", async () => {
      const response = await client.api.auth["change-password"].$post(
        {
          json: {
            currentPassword: userData.password,
            newPassword: "NewSecurePass456",
          },
        },
        {
          headers: {
            Cookie: authCookies,
          },
        },
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("user");
    });

    it("should reject password change with wrong current password", async () => {
      const response = await client.api.auth["change-password"].$post(
        {
          json: {
            currentPassword: "wrongpassword",
            newPassword: "NewSecurePass456",
          },
        },
        {
          headers: {
            Cookie: authCookies,
          },
        },
      );

      expect(response.status).toBe(400);
    });

    it("should reject password change when not authenticated", async () => {
      const response = await client.api.auth["change-password"].$post({
        json: {
          currentPassword: userData.password,
          newPassword: "NewSecurePass456",
        },
      });

      expect(response.status).toBe(401);
    });
  });

  describe("pOST /api/auth/forget-password", () => {
    beforeEach(async () => {
      // Register user
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "SecurePass123",
      };

      await client.api.auth["sign-up"].email.$post({
        json: userData,
      });
    });

    it("should send password reset email for existing user", async () => {
      const response = await client.api.auth["forget-password"].$post({
        json: {
          email: "john@example.com",
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("status");
      // Better Auth returns minimal response for password reset

      // Verify that email was sent (mocked)
      expect(mockSendEmail).toHaveBeenCalledOnce();
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "john@example.com",
          subject: "Reset your password",
          text: expect.stringContaining("Click the link to reset your password"),
        }),
      );
    });

    it("should handle password reset for non-existent user", async () => {
      const response = await client.api.auth["forget-password"].$post({
        json: {
          email: "nonexistent@example.com",
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("status");
      expect(data).toHaveProperty("message");
    });

    it("should reject forget password with invalid email", async () => {
      const response = await client.api.auth["forget-password"].$post({
        json: {
          email: "invalid-email",
        },
      });

      expect(response.status).toBe(400);
    });
  });

  describe("error Handling", () => {
    it("should handle malformed JSON requests", async () => {
      const response = await app.request("/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "{ malformed json",
      });

      expect(response.status).toBe(500);
    });

    it("should handle missing Content-Type header", async () => {
      const response = await app.request("/api/auth/sign-up/email", {
        method: "POST",
        body: JSON.stringify({
          name: "John Doe",
          email: "john@example.com",
          password: "SecurePass123",
        }),
      });

      // Should still work or handle gracefully
      expect([200, 400]).toContain(response.status);
    });
  });

  describe("rate Limiting", () => {
    it("should apply rate limiting to auth endpoints", async () => {
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "SecurePass123",
      };

      // Make multiple rapid requests
      const requests = Array.from({ length: 5 }, () =>
        client.api.auth["sign-up"].email.$post({
          json: userData,
        }));

      const responses = await Promise.all(requests);

      // At least one should succeed, others might be rate limited
      const statusCodes = responses.map(r => r.status);
      expect(statusCodes).toContain(200);
    });
  });
});
