import type { WSContext } from "hono/ws";

import { wsManager } from "../websocket.manager";

const CHANNEL_NAME = "posts";
const PING_INTERVAL = 30000; // 30 seconds

export function createPostsChannel(connectionId: string, userId?: string) {
  let pingInterval: NodeJS.Timeout | null = null;

  return {
    onOpen(_event: Event, ws: WSContext) {
      console.log(`[Posts WS] Connection opened: ${connectionId}${userId ? ` (user: ${userId})` : ""}`);

      // Add connection to manager
      wsManager.addConnection(connectionId, ws, userId);

      // Join posts channel
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

        // Handle subscribe to specific post updates
        if (data.type === "subscribe" && data.postId) {
          const postChannel = `post:${data.postId}`;
          wsManager.joinChannel(connectionId, postChannel);
          ws.send(JSON.stringify({
            type: "subscribed",
            postId: data.postId,
            timestamp: new Date().toISOString(),
          }));
          return;
        }

        // Handle unsubscribe from specific post
        if (data.type === "unsubscribe" && data.postId) {
          const postChannel = `post:${data.postId}`;
          wsManager.leaveChannel(connectionId, postChannel);
          ws.send(JSON.stringify({
            type: "unsubscribed",
            postId: data.postId,
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
        console.error(`[Posts WS] Error processing message:`, error);
        ws.send(JSON.stringify({
          type: "error",
          message: "Failed to process message",
          timestamp: new Date().toISOString(),
        }));
      }
    },

    onClose() {
      console.log(`[Posts WS] Connection closed: ${connectionId}`);
      if (pingInterval) {
        clearInterval(pingInterval);
      }
      wsManager.removeConnection(connectionId);
    },

    onError(event: Event) {
      console.error(`[Posts WS] Error on connection ${connectionId}:`, event);
      if (pingInterval) {
        clearInterval(pingInterval);
      }
      wsManager.removeConnection(connectionId);
    },
  };
}
