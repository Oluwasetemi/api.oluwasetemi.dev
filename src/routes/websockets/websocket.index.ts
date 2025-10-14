import { createNodeWebSocket } from "@hono/node-ws";
import { getCookie } from "hono/cookie";

import { AuthService } from "@/lib/auth";
import { createRouter } from "@/lib/create-app";
import { createGraphQLWebSocketHandler } from "@/routes/graphql/graphql.websocket";

import { createPostsChannel } from "./channels/posts.channel";
import { createProductsChannel } from "./channels/products.channel";
import { createTasksChannel } from "./channels/tasks.channel";
import { createVisitorsChannel } from "./channels/visitors.channel";
import wsPostsClient from "./websocket-posts.client";
import wsProductsClient from "./websocket-products.client";
import wsClient from "./websocket-tasks.client";
import { wsManager } from "./websocket.manager";

const app = createRouter();

// Create WebSocket helpers
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

// WebSocket route for tasks with optional authentication
app.get(
  "/ws/tasks",
  upgradeWebSocket((c) => {
    // Generate unique connection ID
    const connectionId = crypto.randomUUID();

    // Try to extract user from JWT token
    let userId: string | undefined;
    try {
      // Check Authorization header
      const authHeader = c.req.header("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const payload = AuthService.verifyAccessToken(token);
        userId = payload.userId;
      }
      // Check cookie as fallback
      else {
        const cookieToken = getCookie(c, "token");
        if (cookieToken) {
          const payload = AuthService.verifyAccessToken(cookieToken);
          userId = payload.userId;
        }
      }
    }
    catch {
      // Authentication failed, but we allow anonymous connections
      console.log(`[WS] Anonymous connection: ${connectionId}`);
    }

    return createTasksChannel(connectionId, userId);
  }),
);

// WebSocket route for products with optional authentication
app.get(
  "/ws/products",
  upgradeWebSocket((c) => {
    const connectionId = crypto.randomUUID();
    let userId: string | undefined;

    try {
      const authHeader = c.req.header("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const payload = AuthService.verifyAccessToken(token);
        userId = payload.userId;
      }
      else {
        const cookieToken = getCookie(c, "token");
        if (cookieToken) {
          const payload = AuthService.verifyAccessToken(cookieToken);
          userId = payload.userId;
        }
      }
    }
    catch {
      console.log(`[WS] Anonymous connection: ${connectionId}`);
    }

    return createProductsChannel(connectionId, userId);
  }),
);

// WebSocket route for posts with optional authentication
app.get(
  "/ws/posts",
  upgradeWebSocket((c) => {
    const connectionId = crypto.randomUUID();
    let userId: string | undefined;

    try {
      const authHeader = c.req.header("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const payload = AuthService.verifyAccessToken(token);
        userId = payload.userId;
      }
      else {
        const cookieToken = getCookie(c, "token");
        if (cookieToken) {
          const payload = AuthService.verifyAccessToken(cookieToken);
          userId = payload.userId;
        }
      }
    }
    catch {
      console.log(`[WS] Anonymous connection: ${connectionId}`);
    }

    return createPostsChannel(connectionId, userId);
  }),
);

// WebSocket route for visitor counter (no authentication required)
app.get(
  "/ws/visitors",
  upgradeWebSocket(() => {
    const connectionId = crypto.randomUUID();
    return createVisitorsChannel(connectionId);
  }),
);

// GraphQL WebSocket route for subscriptions
app.get(
  "/graphql",
  upgradeWebSocket(() => createGraphQLWebSocketHandler()),
);

// WebSocket stats endpoint
app.get("/ws/stats", (c) => {
  const stats = wsManager.getStats();
  return c.json(stats);
});

// Health check for WebSocket
app.get("/ws/health", (c) => {
  return c.json({
    status: "ok",
    websocket: "ready",
    timestamp: new Date().toISOString(),
  });
});

// Mount the WebSocket client UIs
app.route("/", wsClient);
app.route("/", wsProductsClient);
app.route("/", wsPostsClient);

export { injectWebSocket, upgradeWebSocket };
export default app;
