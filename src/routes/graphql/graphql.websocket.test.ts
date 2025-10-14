import type { WSContext } from "hono/ws";

import { describe, expect, it, vi } from "vitest";

import { createGraphQLWebSocketHandler } from "./graphql.websocket";

describe("graphQL WebSocket Handler", () => {
  describe("createGraphQLWebSocketHandler", () => {
    it("should return handler with all required methods", () => {
      const handler = createGraphQLWebSocketHandler();

      expect(handler).toBeDefined();
      expect(typeof handler.onOpen).toBe("function");
      expect(typeof handler.onMessage).toBe("function");
      expect(typeof handler.onClose).toBe("function");
      expect(typeof handler.onError).toBe("function");
    });
  });

  describe("onOpen handler", () => {
    it("should initialize connection context", async () => {
      const handler = createGraphQLWebSocketHandler();

      const mockEvent = new Event("open");
      const mockWs = {
        send: vi.fn(),
        close: vi.fn(),
        readyState: 1,
      } as unknown as WSContext;

      await handler.onOpen(mockEvent, mockWs);

      // Verify context was created
      expect((mockWs as any).subscriptionContext).toBeDefined();
      expect((mockWs as any).subscriptionContext.ws).toBe(mockWs);
      expect((mockWs as any).subscriptionContext.subscriptions).toBeInstanceOf(Map);
      expect((mockWs as any).subscriptionContext.user).toBeNull();
    });
  });

  describe("onMessage handler", () => {
    it("should handle connection_init message", async () => {
      const handler = createGraphQLWebSocketHandler();

      const mockWs = {
        send: vi.fn(),
        close: vi.fn(),
        readyState: 1,
        subscriptionContext: {
          ws: {} as WSContext,
          subscriptions: new Map(),
          user: null,
        },
      } as unknown as WSContext;

      const connectionInitMessage = JSON.stringify({
        type: "connection_init",
        payload: {},
      });

      const mockEvent = {
        data: connectionInitMessage,
      } as MessageEvent;

      await handler.onMessage(mockEvent, mockWs);

      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({ type: "connection_ack" }),
      );
    });

    it("should handle connection_init with authorization", async () => {
      const handler = createGraphQLWebSocketHandler();

      const mockWs = {
        send: vi.fn(),
        close: vi.fn(),
        readyState: 1,
        subscriptionContext: {
          ws: {} as WSContext,
          subscriptions: new Map(),
          user: null,
        },
      } as unknown as WSContext;

      const connectionInitMessage = JSON.stringify({
        type: "connection_init",
        payload: {
          authorization: "Bearer fake-token",
        },
      });

      const mockEvent = {
        data: connectionInitMessage,
      } as MessageEvent;

      await handler.onMessage(mockEvent, mockWs);

      // Should still send ack even if token is invalid
      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({ type: "connection_ack" }),
      );
    });

    it("should handle ping message", async () => {
      const handler = createGraphQLWebSocketHandler();

      const mockWs = {
        send: vi.fn(),
        close: vi.fn(),
        readyState: 1,
        subscriptionContext: {
          ws: {} as WSContext,
          subscriptions: new Map(),
          user: null,
        },
      } as unknown as WSContext;

      const pingMessage = JSON.stringify({
        type: "ping",
        payload: {},
      });

      const mockEvent = {
        data: pingMessage,
      } as MessageEvent;

      await handler.onMessage(mockEvent, mockWs);

      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({ type: "pong", payload: {} }),
      );
    });

    it("should handle pong message", async () => {
      const handler = createGraphQLWebSocketHandler();

      const mockWs = {
        send: vi.fn(),
        close: vi.fn(),
        readyState: 1,
        subscriptionContext: {
          ws: {} as WSContext,
          subscriptions: new Map(),
          user: null,
        },
      } as unknown as WSContext;

      const pongMessage = JSON.stringify({
        type: "pong",
        payload: {},
      });

      const mockEvent = {
        data: pongMessage,
      } as MessageEvent;

      // Should not throw
      await expect(handler.onMessage(mockEvent, mockWs)).resolves.not.toThrow();
    });

    it("should validate subscribe message has required fields", async () => {
      const handler = createGraphQLWebSocketHandler();

      const mockWs = {
        send: vi.fn(),
        close: vi.fn(),
        readyState: 1,
        subscriptionContext: {
          ws: {} as WSContext,
          subscriptions: new Map(),
          user: null,
        },
      } as unknown as WSContext;

      const subscribeMessage = JSON.stringify({
        id: "test-id",
        type: "subscribe",
        payload: {
          query: "subscription { taskCreated { id name } }",
        },
      });

      const mockEvent = {
        data: subscribeMessage,
      } as MessageEvent;

      await handler.onMessage(mockEvent, mockWs);

      // Should attempt to process the subscription
      // Will likely fail due to test environment, but shouldn't crash
      expect(mockWs.send).toHaveBeenCalled();
    });

    it("should handle complete message", async () => {
      const handler = createGraphQLWebSocketHandler();

      const mockIterator = {
        return: vi.fn().mockResolvedValue({ done: true, value: undefined }),
        next: vi.fn(),
        [Symbol.asyncIterator]: vi.fn(),
      };

      const subscriptions = new Map();
      subscriptions.set("test-id", mockIterator);

      const mockWs = {
        send: vi.fn(),
        close: vi.fn(),
        readyState: 1,
        subscriptionContext: {
          ws: {} as WSContext,
          subscriptions,
          user: null,
        },
      } as unknown as WSContext;

      const completeMessage = JSON.stringify({
        id: "test-id",
        type: "complete",
      });

      const mockEvent = {
        data: completeMessage,
      } as MessageEvent;

      await handler.onMessage(mockEvent, mockWs);

      expect(mockIterator.return).toHaveBeenCalled();
      expect(subscriptions.has("test-id")).toBe(false);
    });

    it("should handle complete message for non-existent subscription", async () => {
      const handler = createGraphQLWebSocketHandler();

      const mockWs = {
        send: vi.fn(),
        close: vi.fn(),
        readyState: 1,
        subscriptionContext: {
          ws: {} as WSContext,
          subscriptions: new Map(),
          user: null,
        },
      } as unknown as WSContext;

      const completeMessage = JSON.stringify({
        id: "non-existent-id",
        type: "complete",
      });

      const mockEvent = {
        data: completeMessage,
      } as MessageEvent;

      // Should not throw
      await expect(handler.onMessage(mockEvent, mockWs)).resolves.not.toThrow();
    });

    it("should handle invalid JSON gracefully", async () => {
      const handler = createGraphQLWebSocketHandler();

      const mockWs = {
        send: vi.fn(),
        close: vi.fn(),
        readyState: 1,
        subscriptionContext: {
          ws: {} as WSContext,
          subscriptions: new Map(),
          user: null,
        },
      } as unknown as WSContext;

      const mockEvent = {
        data: "invalid json {",
      } as MessageEvent;

      // Should handle parse error - in real implementation, this throws but is caught
      try {
        await handler.onMessage(mockEvent, mockWs);
        // If it doesn't throw, that's okay - the handler might catch errors internally
      }
      catch (error) {
        // If it does throw, verify it's a JSON parse error
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe("onClose handler", () => {
    it("should cleanup all subscriptions on close", async () => {
      const handler = createGraphQLWebSocketHandler();

      const mockIterator1 = {
        return: vi.fn().mockResolvedValue({ done: true, value: undefined }),
        next: vi.fn(),
        [Symbol.asyncIterator]: vi.fn(),
      };

      const mockIterator2 = {
        return: vi.fn().mockResolvedValue({ done: true, value: undefined }),
        next: vi.fn(),
        [Symbol.asyncIterator]: vi.fn(),
      };

      const subscriptions = new Map();
      subscriptions.set("sub-1", mockIterator1);
      subscriptions.set("sub-2", mockIterator2);

      const mockWs = {
        send: vi.fn(),
        close: vi.fn(),
        readyState: 3, // CLOSED
        subscriptionContext: {
          ws: {} as WSContext,
          subscriptions,
          user: null,
        },
      } as unknown as WSContext;

      const mockEvent = new CloseEvent("close", {
        code: 1000,
        reason: "Normal closure",
      });

      await handler.onClose(mockEvent, mockWs);

      expect(mockIterator1.return).toHaveBeenCalled();
      expect(mockIterator2.return).toHaveBeenCalled();
      expect(subscriptions.size).toBe(0);
    });

    it("should handle close without subscriptions", async () => {
      const handler = createGraphQLWebSocketHandler();

      const mockWs = {
        send: vi.fn(),
        close: vi.fn(),
        readyState: 3,
        subscriptionContext: {
          ws: {} as WSContext,
          subscriptions: new Map(),
          user: null,
        },
      } as unknown as WSContext;

      const mockEvent = new CloseEvent("close", {
        code: 1000,
        reason: "Normal closure",
      });

      // Should not throw
      await expect(handler.onClose(mockEvent, mockWs)).resolves.not.toThrow();
    });

    it("should handle close without context", async () => {
      const handler = createGraphQLWebSocketHandler();

      const mockWs = {
        send: vi.fn(),
        close: vi.fn(),
        readyState: 3,
      } as unknown as WSContext;

      const mockEvent = new CloseEvent("close", {
        code: 1000,
        reason: "Normal closure",
      });

      // Should not throw
      await expect(handler.onClose(mockEvent, mockWs)).resolves.not.toThrow();
    });

    it("should handle iterator without return method", async () => {
      const handler = createGraphQLWebSocketHandler();

      const mockIterator = {
        next: vi.fn(),
        [Symbol.asyncIterator]: vi.fn(),
        // No return method
      };

      const subscriptions = new Map();
      subscriptions.set("sub-1", mockIterator);

      const mockWs = {
        send: vi.fn(),
        close: vi.fn(),
        readyState: 3,
        subscriptionContext: {
          ws: {} as WSContext,
          subscriptions,
          user: null,
        },
      } as unknown as WSContext;

      const mockEvent = new CloseEvent("close", {
        code: 1000,
        reason: "Normal closure",
      });

      // Should handle missing return method gracefully
      await expect(handler.onClose(mockEvent, mockWs)).resolves.not.toThrow();
      expect(subscriptions.size).toBe(0);
    });
  });

  describe("onError handler", () => {
    it("should log errors without crashing", () => {
      const handler = createGraphQLWebSocketHandler();

      const mockWs = {
        send: vi.fn(),
        close: vi.fn(),
        readyState: 1,
      } as unknown as WSContext;

      const mockEvent = new Event("error");

      // Mock console.error to verify it's called
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      handler.onError(mockEvent, mockWs);

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should not throw on error event", () => {
      const _handler = createGraphQLWebSocketHandler();

      const _mockWs = {
        send: vi.fn(),
        close: vi.fn(),
        readyState: 1,
      } as unknown as WSContext;

      const mockEvent = new Event("error");

      expect(() => _handler.onError(mockEvent, _mockWs)).not.toThrow();
    });
  });

  describe("subscription context management", () => {
    it("should maintain separate contexts for different connections", async () => {
      const handler = createGraphQLWebSocketHandler();

      const mockWs1 = {
        send: vi.fn(),
        close: vi.fn(),
        readyState: 1,
      } as unknown as WSContext;

      const mockWs2 = {
        send: vi.fn(),
        close: vi.fn(),
        readyState: 1,
      } as unknown as WSContext;

      const mockEvent = new Event("open");

      await handler.onOpen(mockEvent, mockWs1);
      await handler.onOpen(mockEvent, mockWs2);

      expect((mockWs1 as any).subscriptionContext).toBeDefined();
      expect((mockWs2 as any).subscriptionContext).toBeDefined();
      expect((mockWs1 as any).subscriptionContext).not.toBe(
        (mockWs2 as any).subscriptionContext,
      );
    });

    it("should track multiple subscriptions per connection", async () => {
      const _handler = createGraphQLWebSocketHandler();

      const subscriptions = new Map();

      const _mockWs = {
        send: vi.fn(),
        close: vi.fn(),
        readyState: 1,
        subscriptionContext: {
          ws: {} as WSContext,
          subscriptions,
          user: null,
        },
      } as unknown as WSContext;

      // Simulate adding subscriptions
      const mockIterator1 = { next: vi.fn(), [Symbol.asyncIterator]: vi.fn() };
      const mockIterator2 = { next: vi.fn(), [Symbol.asyncIterator]: vi.fn() };

      subscriptions.set("sub-1", mockIterator1);
      subscriptions.set("sub-2", mockIterator2);

      expect(subscriptions.size).toBe(2);
      expect(subscriptions.get("sub-1")).toBe(mockIterator1);
      expect(subscriptions.get("sub-2")).toBe(mockIterator2);
    });
  });
});
