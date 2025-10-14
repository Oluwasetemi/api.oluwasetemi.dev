import type { WSContext } from "hono/ws";

import { wsManager } from "../websocket.manager";

const CHANNEL_NAME = "products";
const PING_INTERVAL = 30000; // 30 seconds

export function createProductsChannel(connectionId: string, userId?: string) {
  let pingInterval: NodeJS.Timeout | null = null;

  return {
    onOpen(_event: Event, ws: WSContext) {
      console.log(`[Products WS] Connection opened: ${connectionId}${userId ? ` (user: ${userId})` : ""}`);

      // Add connection to manager
      wsManager.addConnection(connectionId, ws, userId);

      // Join products channel
      wsManager.joinChannel(connectionId, CHANNEL_NAME);

      // Send welcome message
      ws.send(JSON.stringify({
        type: "connected",
        channel: CHANNEL_NAME,
        connectionId,
        timestamp: new Date().toISOString(),
      }));

      // Start ping interval
      pingInterval = setInterval(() => {
        if (wsManager.isConnected(connectionId)) {
          ws.send(JSON.stringify({
            type: "ping",
            timestamp: new Date().toISOString(),
          }));
        }
        else {
          if (pingInterval) {
            clearInterval(pingInterval);
          }
        }
      }, PING_INTERVAL);
    },

    onMessage(event: MessageEvent, ws: WSContext) {
      try {
        const data = JSON.parse(event.data.toString());

        // Handle pong response
        if (data.type === "pong") {
          return;
        }

        // Handle subscribe to specific product updates
        if (data.type === "subscribe" && data.productId) {
          const productChannel = `product:${data.productId}`;
          wsManager.joinChannel(connectionId, productChannel);
          ws.send(JSON.stringify({
            type: "subscribed",
            productId: data.productId,
            timestamp: new Date().toISOString(),
          }));
          return;
        }

        // Handle unsubscribe from specific product
        if (data.type === "unsubscribe" && data.productId) {
          const productChannel = `product:${data.productId}`;
          wsManager.leaveChannel(connectionId, productChannel);
          ws.send(JSON.stringify({
            type: "unsubscribed",
            productId: data.productId,
            timestamp: new Date().toISOString(),
          }));
          return;
        }

        // Echo back unknown messages
        ws.send(JSON.stringify({
          type: "echo",
          data,
          timestamp: new Date().toISOString(),
        }));
      }
      catch (error) {
        console.error(`[Products WS] Error processing message:`, error);
        ws.send(JSON.stringify({
          type: "error",
          message: "Failed to process message",
          timestamp: new Date().toISOString(),
        }));
      }
    },

    onClose() {
      console.log(`[Products WS] Connection closed: ${connectionId}`);
      if (pingInterval) {
        clearInterval(pingInterval);
      }
      wsManager.removeConnection(connectionId);
    },

    onError(event: Event) {
      console.error(`[Products WS] Error on connection ${connectionId}:`, event);
      if (pingInterval) {
        clearInterval(pingInterval);
      }
      wsManager.removeConnection(connectionId);
    },
  };
}
