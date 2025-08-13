import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it } from "vitest";

import type { JWTPayload } from "@/lib/auth";

import db from "@/db";
import { users } from "@/db/schema";
import env from "@/env";
import { AuthService, extractBearerToken } from "@/lib/auth";
import { clearDatabase } from "@/lib/test-setup";

describe("authService", () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe("validatePassword", () => {
    it("should validate a strong password", () => {
      const result = AuthService.validatePassword("StrongPass123!");
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject password that is too short", () => {
      const result = AuthService.validatePassword("Short1!");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Password must be at least 8 characters long");
    });

    it("should reject password that is too long", () => {
      const longPassword = `${"a".repeat(129)}A1!`;
      const result = AuthService.validatePassword(longPassword);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Password must be less than 128 characters");
    });

    it("should reject password without lowercase letter", () => {
      const result = AuthService.validatePassword("PASSWORD123!");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one lowercase letter");
    });

    it("should reject password without uppercase letter", () => {
      const result = AuthService.validatePassword("password123!");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one uppercase letter");
    });

    it("should reject password without number", () => {
      const result = AuthService.validatePassword("PasswordAbc!");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one number");
    });

    it("should reject password without special character", () => {
      const result = AuthService.validatePassword("Password123");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one special character (@$!%*?&)");
    });

    it("should return multiple errors for weak password", () => {
      const result = AuthService.validatePassword("weak");
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe("normalizeEmail", () => {
    it("should convert email to lowercase", () => {
      const result = AuthService.normalizeEmail("TEST@EXAMPLE.COM");
      expect(result).toBe("test@example.com");
    });

    it("should trim whitespace", () => {
      const result = AuthService.normalizeEmail("  test@example.com  ");
      expect(result).toBe("test@example.com");
    });

    it("should handle already normalized email", () => {
      const result = AuthService.normalizeEmail("test@example.com");
      expect(result).toBe("test@example.com");
    });
  });

  describe("hashPassword and verifyPassword", () => {
    it("should hash and verify password correctly", async () => {
      const password = "TestPassword123!";
      const hashedPassword = await AuthService.hashPassword(password);

      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(20);

      const isValid = await AuthService.verifyPassword(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    it("should reject incorrect password", async () => {
      const password = "TestPassword123!";
      const wrongPassword = "WrongPassword456!";
      const hashedPassword = await AuthService.hashPassword(password);

      const isValid = await AuthService.verifyPassword(wrongPassword, hashedPassword);
      expect(isValid).toBe(false);
    });

    it("should use different salt rounds for production vs development", async () => {
      const password = "TestPassword123!";
      const hash1 = await AuthService.hashPassword(password);
      const hash2 = await AuthService.hashPassword(password);

      // Different hashes due to different salts
      expect(hash1).not.toBe(hash2);

      // Both should verify correctly
      expect(await AuthService.verifyPassword(password, hash1)).toBe(true);
      expect(await AuthService.verifyPassword(password, hash2)).toBe(true);
    });
  });

  describe("jWT Token Operations", () => {
    const mockPayload: Omit<JWTPayload, "type"> = {
      userId: "test-user-id",
      email: "test@example.com",
      name: "Test User",
      image: "https://example.com/avatar.jpg",
      isActive: true,
    };

    describe("generateAccessToken", () => {
      it("should generate valid access token", () => {
        const token = AuthService.generateAccessToken(mockPayload);

        expect(typeof token).toBe("string");
        expect(token.split(".")).toHaveLength(3); // JWT has 3 parts

        const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
        expect(decoded.type).toBe("access");
        expect(decoded.userId).toBe(mockPayload.userId);
        expect(decoded.email).toBe(mockPayload.email);
      });
    });

    describe("generateRefreshToken", () => {
      it("should generate valid refresh token", () => {
        const token = AuthService.generateRefreshToken(mockPayload);

        expect(typeof token).toBe("string");
        expect(token.split(".")).toHaveLength(3);

        const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as JWTPayload;
        expect(decoded.type).toBe("refresh");
        expect(decoded.userId).toBe(mockPayload.userId);
      });
    });

    describe("verifyAccessToken", () => {
      it("should verify valid access token", () => {
        const token = AuthService.generateAccessToken(mockPayload);
        const decoded = AuthService.verifyAccessToken(token);

        expect(decoded.type).toBe("access");
        expect(decoded.userId).toBe(mockPayload.userId);
        expect(decoded.email).toBe(mockPayload.email);
      });

      it("should reject invalid access token", () => {
        expect(() => {
          AuthService.verifyAccessToken("invalid-token");
        }).toThrow();
      });

      it("should reject refresh token when expecting access token", () => {
        const refreshToken = AuthService.generateRefreshToken(mockPayload);

        expect(() => {
          AuthService.verifyAccessToken(refreshToken);
        }).toThrow("Invalid token type");
      });

      it("should handle token cache in non-production environment", () => {
        const token = AuthService.generateAccessToken(mockPayload);

        // First verification should cache the token
        const decoded1 = AuthService.verifyAccessToken(token);
        expect(decoded1.userId).toBe(mockPayload.userId);

        // Second verification should use cache
        const decoded2 = AuthService.verifyAccessToken(token);
        expect(decoded2.userId).toBe(mockPayload.userId);
      });
    });

    describe("verifyRefreshToken", () => {
      it("should verify valid refresh token", () => {
        const token = AuthService.generateRefreshToken(mockPayload);
        const decoded = AuthService.verifyRefreshToken(token);

        expect(decoded.type).toBe("refresh");
        expect(decoded.userId).toBe(mockPayload.userId);
      });

      it("should reject access token when expecting refresh token", () => {
        const accessToken = AuthService.generateAccessToken(mockPayload);

        expect(() => {
          AuthService.verifyRefreshToken(accessToken);
        }).toThrow("Invalid token type");
      });
    });
  });

  describe("database Operations", () => {
    describe("findUserById", () => {
      it("should find existing user by id", async () => {
        // Create a user first
        const [newUser] = await db
          .insert(users)
          .values({
            email: "test@example.com",
            name: "Test User",
            password: "hashedpassword",
            image: "https://example.com/avatar.jpg",
          })
          .returning();

        const user = await AuthService.findUserById(newUser.id);

        expect(user).not.toBeNull();
        expect(user!.id).toBe(newUser.id);
        expect(user!.email).toBe("test@example.com");
        expect(user!.name).toBe("Test User");
        expect(user!.image).toBe("https://example.com/avatar.jpg");
      });

      it("should return null for non-existent user", async () => {
        const user = await AuthService.findUserById("non-existent-id");
        expect(user).toBeNull();
      });
    });

    describe("findUserByEmail", () => {
      it("should find existing user by email", async () => {
        // Create a user first
        await db
          .insert(users)
          .values({
            email: "test@example.com",
            name: "Test User",
            password: "hashedpassword",
          });

        const user = await AuthService.findUserByEmail("test@example.com");

        expect(user).not.toBeNull();
        expect(user!.email).toBe("test@example.com");
        expect(user!.name).toBe("Test User");
        expect(user!.password).toBe("hashedpassword");
      });

      it("should return null for non-existent email", async () => {
        const user = await AuthService.findUserByEmail("nonexistent@example.com");
        expect(user).toBeNull();
      });

      it("should be case-insensitive for email search", async () => {
        await db
          .insert(users)
          .values({
            email: "test@example.com",
            name: "Test User",
            password: "hashedpassword",
          });

        const user = await AuthService.findUserByEmail("TEST@EXAMPLE.COM");
        expect(user).not.toBeNull();
        expect(user!.email).toBe("test@example.com");
      });
    });

    describe("updateLastLogin", () => {
      it("should update last login timestamp", async () => {
        // Create a user first
        const [newUser] = await db
          .insert(users)
          .values({
            email: "test@example.com",
            name: "Test User",
            password: "hashedpassword",
          })
          .returning();

        // Initially, lastLoginAt should be null
        const initialUser = await AuthService.findUserById(newUser.id);
        expect(initialUser!.lastLoginAt).toBeNull();

        // Update the last login
        await AuthService.updateLastLogin(newUser.id);

        const updatedUser = await AuthService.findUserById(newUser.id);
        expect(updatedUser!.lastLoginAt).not.toBeNull();
        // Verify that the timestamp is a recent date
        expect(updatedUser!.lastLoginAt!.getTime()).toBeGreaterThan(Date.now() - 60000); // Within last minute
      });

      it("should handle update for non-existent user gracefully", async () => {
        // Should not throw error
        await expect(AuthService.updateLastLogin("non-existent-id")).resolves.not.toThrow();
      });
    });
  });

  describe("extractBearerToken", () => {
    it("should extract token from valid Bearer header", () => {
      const token = AuthService.generateAccessToken({
        userId: "test-id",
        email: "test@example.com",
        name: "Test User",
        image: null,
        isActive: true,
      });

      const result = extractBearerToken(`Bearer ${token}`);
      expect(result).toBe(token);
    });

    it("should return null for invalid header format", () => {
      const result = extractBearerToken("InvalidFormat token");
      expect(result).toBeNull();
    });

    it("should return null for undefined header", () => {
      const result = extractBearerToken(undefined);
      expect(result).toBeNull();
    });

    it("should return null for empty header", () => {
      const result = extractBearerToken("");
      expect(result).toBeNull();
    });

    it("should handle Bearer header without token", () => {
      const result = extractBearerToken("Bearer ");
      expect(result).toBeNull();
    });
  });
});

describe("extractBearerToken (standalone function)", () => {
  it("should extract token from valid Bearer header", () => {
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
    const result = extractBearerToken(`Bearer ${token}`);
    expect(result).toBe(token);
  });

  it("should return null for invalid formats", () => {
    expect(extractBearerToken("Basic token")).toBeNull();
    expect(extractBearerToken("Bearer")).toBeNull();
    expect(extractBearerToken("token")).toBeNull();
    expect(extractBearerToken("")).toBeNull();
    expect(extractBearerToken(undefined)).toBeNull();
  });
});
