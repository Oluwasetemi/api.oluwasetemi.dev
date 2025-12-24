import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { logger } from "@/middlewares/pino-logger";
import { handleUnhandledRejection } from "@/utils/process-handlers";

describe("process handlers", () => {
  describe("unhandledRejection handler", () => {
    beforeEach(() => {
      // Spy on logger.error
      vi.spyOn(logger, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should log the correct message and stack when the reason is an Error object", () => {
      // Arrange
      const testError = new Error("Test error message");
      testError.stack = "Error: Test error message\n    at Object.<anonymous> (/test/file.js:1:1)";
      const testPromise = Promise.reject(testError).catch(() => {});

      // Act
      handleUnhandledRejection(testError, testPromise);

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        {
          error: "Test error message",
          stack: "Error: Test error message\n    at Object.<anonymous> (/test/file.js:1:1)",
          promise: testPromise,
        },
        "Unhandled Promise Rejection",
      );
    });

    it("should log the correct message when the reason is a string", () => {
      // Arrange
      const testReason = "String rejection reason";
      const testPromise = Promise.reject(testReason).catch(() => {});

      // Act
      handleUnhandledRejection(testReason, testPromise);

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        {
          error: "String rejection reason",
          stack: undefined,
          promise: testPromise,
        },
        "Unhandled Promise Rejection",
      );
    });

    it("should log the correct message when the reason is a non-Error object", () => {
      // Arrange
      const testReason = { code: 500, message: "Internal server error" };
      const testPromise = Promise.reject(testReason).catch(() => {});

      // Act
      handleUnhandledRejection(testReason, testPromise);

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        {
          error: "[object Object]",
          stack: undefined,
          promise: testPromise,
        },
        "Unhandled Promise Rejection",
      );
    });

    it("should handle null reason", () => {
      // Arrange
      const testReason = null;
      const testPromise = Promise.reject(testReason).catch(() => {});

      // Act
      handleUnhandledRejection(testReason, testPromise);

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        {
          error: "null",
          stack: undefined,
          promise: testPromise,
        },
        "Unhandled Promise Rejection",
      );
    });

    it("should handle undefined reason", () => {
      // Arrange
      const testReason = undefined;
      const testPromise = Promise.reject(testReason).catch(() => {});

      // Act
      handleUnhandledRejection(testReason, testPromise);

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        {
          error: "undefined",
          stack: undefined,
          promise: testPromise,
        },
        "Unhandled Promise Rejection",
      );
    });

    it("should handle number reason", () => {
      // Arrange
      const testReason = 404;
      const testPromise = Promise.reject(testReason).catch(() => {});

      // Act
      handleUnhandledRejection(testReason, testPromise);

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        {
          error: "404",
          stack: undefined,
          promise: testPromise,
        },
        "Unhandled Promise Rejection",
      );
    });

    it("should handle boolean reason", () => {
      // Arrange
      const testReason = false;
      const testPromise = Promise.reject(testReason).catch(() => {});

      // Act
      handleUnhandledRejection(testReason, testPromise);

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        {
          error: "false",
          stack: undefined,
          promise: testPromise,
        },
        "Unhandled Promise Rejection",
      );
    });

    it("should extract stack trace from Error with custom properties", () => {
      // Arrange
      const testError = new Error("Custom error");
      (testError as any).statusCode = 500;
      testError.stack = "Error: Custom error\n    at custom handler";
      const testPromise = Promise.reject(testError).catch(() => {});

      // Act
      handleUnhandledRejection(testError, testPromise);

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        {
          error: "Custom error",
          stack: "Error: Custom error\n    at custom handler",
          promise: testPromise,
        },
        "Unhandled Promise Rejection",
      );
    });
  });
});
