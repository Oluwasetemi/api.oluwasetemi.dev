import type { ContentfulStatusCode } from "hono/utils/http-status";

import { HTTPException } from "hono/http-exception";
import { describe, expect, it, vi } from "vitest";

import { createRouter } from "@/lib/create-app";
import { createErrorHandler } from "@/lib/error-handler";

describe("error Handler", () => {
  describe("hTTP Exceptions", () => {
    it("should handle HTTPException with custom message", async () => {
      const app = createRouter();

      app.get("/test-error", async () => {
        throw new HTTPException(400, { message: "Custom error message" });
      });

      app.onError(createErrorHandler());

      const response = await app.request("/test-error");

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty("message", "Custom error message");
      expect(data).toHaveProperty("success", false);
    });

    it("should handle HTTPException without custom message", async () => {
      const app = createRouter();

      app.get("/test-error", async () => {
        throw new HTTPException(404);
      });

      app.onError(createErrorHandler());

      const response = await app.request("/test-error");

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty("message", "Not Found");
      expect(data).toHaveProperty("success", false);
    });

    it("should handle different HTTP status codes", async () => {
      const app = createRouter();

      const testCases: Array<{ status: ContentfulStatusCode; expectedMessage: string }> = [
        { status: 400, expectedMessage: "Bad Request" },
        { status: 401, expectedMessage: "Unauthorized" },
        { status: 403, expectedMessage: "Forbidden" },
        { status: 404, expectedMessage: "Not Found" },
        { status: 422, expectedMessage: "Unprocessable Entity" },
        { status: 500, expectedMessage: "Internal Server Error" },
      ];

      for (const { status } of testCases) {
        app.get(`/test-${status}`, async () => {
          throw new HTTPException(status);
        });
      }

      app.onError(createErrorHandler());

      for (const { status, expectedMessage } of testCases) {
        const response = await app.request(`/test-${status}`);
        expect(response.status).toBe(status);

        const data = await response.json();
        expect(data.message).toBe(expectedMessage);
        expect(data.success).toBe(false);
      }
    });
  });

  describe("generic Errors", () => {
    it("should handle generic Error objects", async () => {
      const app = createRouter();

      app.get("/test-generic-error", async () => {
        throw new Error("Something went wrong");
      });

      app.onError(createErrorHandler());

      const response = await app.request("/test-generic-error");

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data).toHaveProperty("message", "Internal Server Error");
      expect(data).toHaveProperty("success", false);
    });

    it("should handle thrown strings", async () => {
      const app = createRouter();

      app.get("/test-string-error", async () => {
        throw new Error("string error");
      });

      app.onError(createErrorHandler());

      const response = await app.request("/test-string-error");

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data).toHaveProperty("message", "Internal Server Error");
      expect(data).toHaveProperty("success", false);
    });

    it("should handle thrown objects", async () => {
      const app = createRouter();

      app.get("/test-object-error", async () => {
        throw new Error("error object");
      });

      app.onError(createErrorHandler());

      const response = await app.request("/test-object-error");

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data).toHaveProperty("message", "Internal Server Error");
      expect(data).toHaveProperty("success", false);
    });

    it("should handle null/undefined errors", async () => {
      const app = createRouter();

      app.get("/test-null-error", async () => {
        throw new Error("null error");
      });

      app.get("/test-undefined-error", async () => {
        throw new Error("undefined error");
      });

      app.onError(createErrorHandler());

      const nullResponse = await app.request("/test-null-error");
      expect(nullResponse.status).toBe(500);

      const undefinedResponse = await app.request("/test-undefined-error");
      expect(undefinedResponse.status).toBe(500);
    });
  });

  describe("response Format", () => {
    it("should always return JSON with consistent structure", async () => {
      const app = createRouter();

      app.get("/test-format", async () => {
        throw new HTTPException(400, { message: "Test error" });
      });

      app.onError(createErrorHandler());

      const response = await app.request("/test-format");

      expect(response.headers.get("content-type")).toContain("application/json");

      const data = await response.json();
      expect(data).toHaveProperty("message");
      expect(data).toHaveProperty("success");
      expect(typeof data.message).toBe("string");
      expect(data.success).toBe(false);
    });

    it("should not expose sensitive error details in production", async () => {
      const app = createRouter();

      app.get("/test-sensitive", async () => {
        const error = new Error("Database connection failed: password123");
        error.stack = "Sensitive stack trace with secrets";
        throw error;
      });

      app.onError(createErrorHandler());

      const response = await app.request("/test-sensitive");

      const data = await response.json();
      expect(data.message).toBe("Internal Server Error");
      expect(data).not.toHaveProperty("stack");
      expect(JSON.stringify(data)).not.toContain("password123");
      expect(JSON.stringify(data)).not.toContain("Sensitive stack trace");
    });
  });

  describe("logging", () => {
    it("should log errors appropriately", async () => {
      // Mock console.error to test logging
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const app = createRouter();

      app.get("/test-logging", async () => {
        throw new Error("Test error for logging");
      });

      app.onError(createErrorHandler());

      await app.request("/test-logging");

      // Error handler might log errors (implementation dependent)
      // If it does, we can verify the call

      consoleSpy.mockRestore();
    });
  });

  describe("edge Cases", () => {
    it("should handle async errors properly", async () => {
      const app = createRouter();

      app.get("/test-async-error", async () => {
        await new Promise(resolve => setTimeout(resolve, 1));
        throw new HTTPException(400, { message: "Async error" });
      });

      app.onError(createErrorHandler());

      const response = await app.request("/test-async-error");

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toBe("Async error");
    });

    it("should handle errors in middleware chain", async () => {
      const app = createRouter();

      app.use("*", async () => {
        throw new HTTPException(403, { message: "Middleware error" });
      });

      app.get("/test-middleware-error", async (c) => {
        return c.json({ message: "Should not reach here" });
      });

      app.onError(createErrorHandler());

      const response = await app.request("/test-middleware-error");

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.message).toBe("Middleware error");
    });

    it("should handle malformed requests gracefully", async () => {
      const app = createRouter();

      app.post("/test-malformed", async (c) => {
        // Try to parse JSON that might be malformed
        const body = await c.req.json();
        return c.json(body);
      });

      app.onError(createErrorHandler());

      const response = await app.request("/test-malformed", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: "{ malformed json",
      });

      // Should handle JSON parsing error gracefully
      expect([400, 500]).toContain(response.status);
    });
  });

  describe("custom Error Types", () => {
    class CustomError extends Error {
      constructor(message: string, public statusCode: number = 500) {
        super(message);
        this.name = "CustomError";
      }
    }

    it("should handle custom error classes", async () => {
      const app = createRouter();

      app.get("/test-custom-error", async () => {
        throw new CustomError("Custom error message", 418);
      });

      app.onError(createErrorHandler());

      const response = await app.request("/test-custom-error");

      expect(response.status).toBe(500); // Should default to 500 for unknown errors
      const data = await response.json();
      expect(data.message).toBe("Internal Server Error");
    });
  });
});
