import { describe, expect, it } from "vitest";

import { generateUUID, isValidUUID } from "@/utils/uuid";

describe("uUID Utilities", () => {
  describe("generateUUID", () => {
    it("should generate a valid UUID", () => {
      const uuid = generateUUID();

      expect(typeof uuid).toBe("string");
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it("should generate unique UUIDs", () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();
      const uuid3 = generateUUID();

      expect(uuid1).not.toBe(uuid2);
      expect(uuid2).not.toBe(uuid3);
      expect(uuid1).not.toBe(uuid3);
    });

    it("should generate UUIDs of correct length", () => {
      const uuid = generateUUID();
      expect(uuid.length).toBe(36); // Standard UUID length with hyphens
    });

    it("should generate multiple valid UUIDs consistently", () => {
      const uuids = Array.from({ length: 100 }, () => generateUUID());

      // All should be valid UUIDs
      uuids.forEach((uuid) => {
        expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      });

      // All should be unique
      const uniqueUuids = new Set(uuids);
      expect(uniqueUuids.size).toBe(100);
    });
  });

  describe("isValidUUID", () => {
    it("should validate correct UUID format", () => {
      const validUuids = [
        "123e4567-e89b-12d3-a456-426614174000",
        "550e8400-e29b-41d4-a716-446655440000",
        "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        generateUUID(), // Generated UUID should be valid
      ];

      validUuids.forEach((uuid) => {
        expect(isValidUUID(uuid)).toBe(true);
      });
    });

    it("should reject invalid UUID formats", () => {
      const invalidUuids = [
        "not-a-uuid",
        "123e4567-e89b-12d3-a456-42661417400", // Too short
        "123e4567-e89b-12d3-a456-4266141740000", // Too long
        "123e4567-e89b-12d3-a456-42661417400g", // Invalid character
        "123e4567e89b12d3a456426614174000", // Missing hyphens
        "123e4567-e89b-12d3-a456", // Incomplete
        "", // Empty string
        "123e4567-e89b-12d3-a456-426614174000-extra", // Extra parts
        "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", // Non-hex characters
      ];

      invalidUuids.forEach((uuid) => {
        expect(isValidUUID(uuid)).toBe(false);
      });
    });

    it("should handle edge cases", () => {
      expect(isValidUUID(null as any)).toBe(false);
      expect(isValidUUID(undefined as any)).toBe(false);
      expect(isValidUUID(123 as any)).toBe(false);
      expect(isValidUUID({} as any)).toBe(false);
      expect(isValidUUID([] as any)).toBe(false);
    });

    it("should be case insensitive", () => {
      const uuid = "123E4567-E89B-12D3-A456-426614174000";
      const lowerUuid = "123e4567-e89b-12d3-a456-426614174000";

      expect(isValidUUID(uuid)).toBe(true);
      expect(isValidUUID(lowerUuid)).toBe(true);
    });

    it("should validate all generated UUIDs", () => {
      // Test that all generated UUIDs pass validation
      for (let i = 0; i < 50; i++) {
        const uuid = generateUUID();
        expect(isValidUUID(uuid)).toBe(true);
      }
    });
  });

  describe("integration", () => {
    it("should work together correctly", () => {
      // Generate UUID and validate it
      const uuid = generateUUID();
      expect(isValidUUID(uuid)).toBe(true);

      // Multiple generations
      const uuids = Array.from({ length: 10 }, () => generateUUID());
      uuids.forEach((uuid) => {
        expect(isValidUUID(uuid)).toBe(true);
      });
    });
  });
});
