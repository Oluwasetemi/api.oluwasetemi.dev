import { serve } from "@hono/node-server";
import { showRoutes } from "hono/dev";

import app from "@/app";
import env from "@/env";
import { injectWebSocket } from "@/routes/websockets/websocket.index";
import { setupAnalyticsCleanup } from "@/services/cleanup.service";

const server = serve(
  {
    fetch: app.fetch,
    port: env.PORT || 4444,
  },
  (info) => {
    // eslint-disable-next-line no-console
    console.log(`Server is running on http://localhost:${info.port}`);

    // Initialize analytics cleanup service
    setupAnalyticsCleanup();

    // Inject Hono WebSocket support
    injectWebSocket(server);

    // eslint-disable-next-line no-console
    console.log(`GraphQL subscriptions ready at ws://localhost:${info.port}/graphql`);

    // eslint-disable-next-line no-console
    console.log("WebSocket server ready");
  },
);

if (env.NODE_ENV === "development") {
  showRoutes(app, {
    verbose: true,
  });
}

// Graceful shutdown handlers
function shutdown(signal: string) {
  // eslint-disable-next-line no-console
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  // Force exit after timeout
  const timeoutId = setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);

  // Close server first
  server.close(() => {
    clearTimeout(timeoutId);
    // eslint-disable-next-line no-console
    console.log("Server closed");
    process.exit(0);
  });
}

// Handle termination signals
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  shutdown("UNCAUGHT_EXCEPTION");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  shutdown("UNCAUGHT_REJECTION");
});
