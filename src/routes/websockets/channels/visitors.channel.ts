import type { WSContext, WSEvents } from "hono/ws";

import { wsManager } from "../websocket.manager";

const VISITOR_CHANNEL = "visitors";

// Track active visitors (connections viewing the index page)
const activeVisitors = new Set<string>();

export function createVisitorsChannel(connectionId: string) {
  const handlers: WSEvents = {
    onOpen(_event, ws: WSContext) {
      console.log(`[WS Visitors] Client connected: ${connectionId}`);

      // Add to manager and channel
      wsManager.addConnection(connectionId, ws);
      wsManager.joinChannel(connectionId, VISITOR_CHANNEL);

      // Add to active visitors
      activeVisitors.add(connectionId);

      // Broadcast updated visitor count to all connected clients
      broadcastVisitorCount();
    },

    onMessage(event, ws: WSContext) {
      try {
        const data = JSON.parse(event.data.toString());

        // Handle different message types
        switch (data.type) {
          case "ping":
            ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
            break;

          case "request_count":
            // Send current visitor count to requesting client
            ws.send(JSON.stringify({
              type: "visitor_count",
              count: activeVisitors.size,
              timestamp: Date.now(),
            }));
            break;

          default:
            console.log(`[WS Visitors] Unknown message type: ${data.type}`);
        }
      }
      catch (error) {
        console.error(`[WS Visitors] Error processing message:`, error);
      }
    },

    onClose() {
      console.log(`[WS Visitors] Client disconnected: ${connectionId}`);

      // Remove from active visitors
      activeVisitors.delete(connectionId);

      // Remove from manager
      wsManager.removeConnection(connectionId);

      // Broadcast updated visitor count
      broadcastVisitorCount();
    },

    onError(event) {
      console.error(`[WS Visitors] Error on connection ${connectionId}:`, event);

      // Clean up on error
      activeVisitors.delete(connectionId);
      wsManager.removeConnection(connectionId);
    },
  };

  return handlers;
}

// Broadcast current visitor count to all connected clients
function broadcastVisitorCount() {
  const message = {
    type: "visitor_count",
    count: activeVisitors.size,
    timestamp: Date.now(),
  };

  wsManager.broadcast(VISITOR_CHANNEL, message);
}

// Export function to get current visitor count
export function getVisitorCount(): number {
  return activeVisitors.size;
}
