import type { WSContext } from "hono/ws";

import { wsManager } from "../websocket.manager";

const CHANNEL_NAME = "tasks";
const PING_INTERVAL = 30000; // 30 seconds

export function createTasksChannel(connectionId: string, userId?: string) {
  let pingInterval: NodeJS.Timeout | null = null;

  return {
    onOpen(_event: Event, ws: WSContext) {
      console.log(`[Tasks WS] Connection opened: ${connectionId}${userId ? ` (user: ${userId})` : ""}`);

      // Add connection to manager
      wsManager.addConnection(connectionId, ws, userId);

      // Join tasks channel
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

        // Handle subscribe to specific task updates
        if (data.type === "subscribe" && data.taskId) {
          const taskChannel = `task:${data.taskId}`;
          wsManager.joinChannel(connectionId, taskChannel);
          ws.send(JSON.stringify({
            type: "subscribed",
            taskId: data.taskId,
            timestamp: new Date().toISOString(),
          }));
          return;
        }

        // Handle unsubscribe from specific task
        if (data.type === "unsubscribe" && data.taskId) {
          const taskChannel = `task:${data.taskId}`;
          wsManager.leaveChannel(connectionId, taskChannel);
          ws.send(JSON.stringify({
            type: "unsubscribed",
            taskId: data.taskId,
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
        console.error(`[Tasks WS] Error processing message:`, error);
        ws.send(JSON.stringify({
          type: "error",
          message: "Failed to process message",
          timestamp: new Date().toISOString(),
        }));
      }
    },

    onClose() {
      console.log(`[Tasks WS] Connection closed: ${connectionId}`);
      if (pingInterval) {
        clearInterval(pingInterval);
      }
      wsManager.removeConnection(connectionId);
    },

    onError(event: Event) {
      console.error(`[Tasks WS] Error on connection ${connectionId}:`, event);
      if (pingInterval) {
        clearInterval(pingInterval);
      }
      wsManager.removeConnection(connectionId);
    },
  };
}
