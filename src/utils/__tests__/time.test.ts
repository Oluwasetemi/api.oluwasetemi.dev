import { beforeEach, describe, expect, it } from "vitest";

import type { AuthUser } from "@/lib/auth";

import db from "@/db";
import { users } from "@/db/schema";
import { AuthService } from "@/lib/auth";
import { clearDatabase } from "@/lib/test-setup";
import { formatUserForGraphQL, getUserWithTimestamps, timestampToISOString } from "@/utils/time";

describe("time Utilities", () => {
  describe("timestampToISOString", () => {
    it("should convert Date object to ISO string", () => {
      const date = new Date("2024-01-15T10:30:00.000Z");
      const result = timestampToISOString(date);

      expect(result).toBe("2024-01-15T10:30:00.000Z");
    });

    it("should convert number timestamp to ISO string", () => {
      const timestamp = new Date("2024-01-15T10:30:00.000Z").getTime();
      const result = timestampToISOString(timestamp);

      expect(result).toBe("2024-01-15T10:30:00.000Z");
    });

    it("should return null for null input", () => {
      const result = timestampToISOString(null);
      expect(result).toBeNull();
    });

    it("should return null for undefined input", () => {
      const result = timestampToISOString(undefined as any);
      expect(result).toBeNull();
    });

    it("should handle various timestamp formats", () => {
      const testCases = [
        { input: new Date("2024-12-25T00:00:00.000Z"), expected: "2024-12-25T00:00:00.000Z" },
        { input: 1705312200000, expected: "2024-01-15T09:50:00.000Z" }, // Specific timestamp
        { input: 0, expected: "1970-01-01T00:00:00.000Z" }, // Unix epoch
      ];

      testCases.forEach(({ input, expected }) => {
        expect(timestampToISOString(input)).toStrictEqual(expected);
      });
    });

    it("should handle edge cases", () => {
      // Very far future date
      const futureDate = new Date("2099-12-31T23:59:59.999Z");
      expect(timestampToISOString(futureDate)).toBe("2099-12-31T23:59:59.999Z");

      // Very past date
      const pastDate = new Date("1900-01-01T00:00:00.000Z");
      expect(timestampToISOString(pastDate)).toBe("1900-01-01T00:00:00.000Z");
    });
  });

  describe("formatUserForGraphQL", () => {
    it("should format user object with timestamp conversion", () => {
      const mockUser: AuthUser = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        image: "https://example.com/avatar.jpg",
        isActive: true,
        lastLoginAt: new Date("2024-01-15T10:30:00.000Z"),
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        updatedAt: new Date("2024-01-15T12:00:00.000Z"),
        // @ts-expect-error otherField is not declared as part of the Auth type
        otherField: "should-remain-unchanged",
      };

      const result = formatUserForGraphQL(mockUser);

      expect(result).toEqual({
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        image: "https://example.com/avatar.jpg",
        isActive: true,
        lastLoginAt: "2024-01-15T10:30:00.000Z",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-15T12:00:00.000Z",
        otherField: "should-remain-unchanged",
      });
    });

    it("should handle null timestamp values", () => {
      // @ts-expect-error error
      const mockUser: AuthUser = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        lastLoginAt: null,
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        updatedAt: null,
      };

      const result = formatUserForGraphQL(mockUser);

      expect(result).toEqual({
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        lastLoginAt: null,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: null,
      });
    });

    it("should handle numeric timestamps", () => {
      const mockUser: AuthUser = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        // @ts-expect-error expecting Date
        lastLoginAt: 1705312200000, // Numeric timestamp
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        // @ts-expect-error expecting Date
        updatedAt: 1705313200000,
      };

      const result = formatUserForGraphQL(mockUser);

      expect(result.lastLoginAt).toBe("2024-01-15T09:50:00.000Z");
      expect(result.createdAt).toBe("2024-01-01T00:00:00.000Z");
      expect(result.updatedAt).toBe("2024-01-15T10:06:40.000Z");
    });

    it("should preserve all other fields unchanged", () => {
      const mockUser: AuthUser = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        // @ts-expect-error unknown field
        customField: { nested: "object" },
        arrayField: [1, 2, 3],
        booleanField: false,
        numberField: 42,
        lastLoginAt: new Date("2024-01-15T10:30:00.000Z"),
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        updatedAt: new Date("2024-01-15T12:00:00.000Z"),
      };

      const result = formatUserForGraphQL(mockUser);

      // @ts-expect-error some custom field
      expect(result.customField).toEqual({ nested: "object" });
      // @ts-expect-error some custom field
      expect(result.arrayField).toEqual([1, 2, 3]);
      // @ts-expect-error some custom field
      expect(result.booleanField).toBe(false);
      // @ts-expect-error some custom field
      expect(result.numberField).toBe(42);
    });
  });

  describe("getUserWithTimestamps", () => {
    beforeEach(async () => {
      await clearDatabase();
    });

    it("should return user with actual timestamps", async () => {
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

      // Update last login
      await AuthService.updateLastLogin(newUser.id);

      const mockPayload = {
        userId: newUser.id,
        email: "test@example.com",
        name: "Test User",
        image: "https://example.com/avatar.jpg",
        isActive: true,
        type: "access" as const,
        exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
      };

      const result = await getUserWithTimestamps(mockPayload);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(newUser.id);
      expect(result!.email).toBe("test@example.com");
      expect(result!.name).toBe("Test User");
      expect(result!.createdAt).toBeInstanceOf(Date);
      expect(result!.updatedAt).toBeInstanceOf(Date);
      expect(result!.lastLoginAt).toBeInstanceOf(Date);
    });

    it("should return null for non-existent user", async () => {
      const mockPayload = {
        userId: "non-existent-id",
        email: "test@example.com",
        name: "Test User",
        image: null,
        isActive: true,
        type: "access" as const,
        exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
      };

      const result = await getUserWithTimestamps(mockPayload);
      expect(result).toBeNull();
    });

    it("should return null for inactive user", async () => {
      // Create an inactive user
      const [newUser] = await db
        .insert(users)
        .values({
          email: "test@example.com",
          name: "Test User",
          password: "hashedpassword",
          isActive: false, // Inactive user
        })
        .returning();

      const mockPayload = {
        userId: newUser.id,
        email: "test@example.com",
        name: "Test User",
        image: null,
        isActive: false,
        type: "access" as const,
        exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
      };

      const result = await getUserWithTimestamps(mockPayload);
      expect(result).toBeNull();
    });

    it("should handle user without lastLoginAt", async () => {
      // Create a user without updating lastLoginAt
      const [newUser] = await db
        .insert(users)
        .values({
          email: "test@example.com",
          name: "Test User",
          password: "hashedpassword",
        })
        .returning();

      const mockPayload = {
        userId: newUser.id,
        email: "test@example.com",
        name: "Test User",
        image: null,
        isActive: true,
        type: "access" as const,
        exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
      };

      const result = await getUserWithTimestamps(mockPayload);

      expect(result).not.toBeNull();
      expect(result!.lastLoginAt).toBeNull();
      expect(result!.createdAt).toBeInstanceOf(Date);
      expect(result!.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("integration Tests", () => {
    beforeEach(async () => {
      await clearDatabase();
    });

    it("should work together for complete user formatting", async () => {
      // Create and fetch user
      const [newUser] = await db
        .insert(users)
        .values({
          email: "integration@example.com",
          name: "Integration User",
          password: "hashedpassword",
          image: "https://example.com/integration.jpg",
        })
        .returning();

      await AuthService.updateLastLogin(newUser.id);

      const mockPayload = {
        userId: newUser.id,
        email: "integration@example.com",
        name: "Integration User",
        image: "https://example.com/integration.jpg",
        isActive: true,
        type: "access" as const,
        exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
      };

      // Get user with timestamps
      const userWithTimestamps = await getUserWithTimestamps(mockPayload);
      expect(userWithTimestamps).not.toBeNull();

      // Format for GraphQL
      const formattedUser = formatUserForGraphQL(userWithTimestamps!);

      expect(formattedUser.id).toBe(newUser.id);
      expect(formattedUser.email).toBe("integration@example.com");
      expect(formattedUser.name).toBe("Integration User");
      expect(formattedUser.image).toBe("https://example.com/integration.jpg");
      expect(typeof formattedUser.createdAt).toBe("string");
      expect(typeof formattedUser.updatedAt).toBe("string");
      expect(typeof formattedUser.lastLoginAt).toBe("string");

      // Verify ISO string format
      expect(formattedUser.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(formattedUser.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(formattedUser.lastLoginAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});
