import { serve } from "@hono/node-server";
import { showRoutes } from "hono/dev";

import app from "@/app";
import env from "@/env";
import { logger } from "@/middlewares/pino-logger";
import { injectWebSocket } from "@/routes/websockets/websocket.index";
import { setupAnalyticsCleanup } from "@/services/cleanup.service";
import { handleUncaughtException, handleUnhandledRejection } from "@/utils/process-handlers";

const server = serve(
  {
    fetch: app.fetch,
    port: env.PORT || 4444,
  },
  (info) => {
    logger.info({ port: info.port }, `Server is running on http://localhost:${info.port}`);

    // Initialize analytics cleanup service
    setupAnalyticsCleanup();

    // Inject Hono WebSocket support
    injectWebSocket(server);

    logger.info({ port: info.port }, `GraphQL subscriptions ready at ws://localhost:${info.port}/graphql`);
    logger.info("WebSocket server ready");
  },
);

if (env.NODE_ENV === "development") {
  showRoutes(app, {
    verbose: true,
  });
}

// Graceful shutdown state
let isShuttingDown = false;

/**
 * Gracefully shut down the server.
 * Handles cleanup of server connections and ensures proper process exit.
 *
 * @param signal - The signal that triggered the shutdown (e.g., SIGTERM, SIGINT)
 */
async function shutdown(signal: string) {
  // Prevent multiple shutdown calls
  if (isShuttingDown) {
    logger.warn({ signal }, "Shutdown already in progress, ignoring signal");
    return;
  }

  isShuttingDown = true;
  logger.info({ signal }, "Received shutdown signal, starting graceful shutdown...");

  // Set a timeout to force exit if shutdown takes too long
  const forceExitTimeout = setTimeout(() => {
    logger.error({ signal }, "Graceful shutdown timeout exceeded, forcing exit");
    process.exit(1);
  }, 10000); // 10 second timeout

  try {
    // Close the HTTP server
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) {
          reject(err);
        }
        else {
          resolve();
        }
      });
    });

    logger.info({ signal }, "Server closed successfully");
    clearTimeout(forceExitTimeout);

    // Exit with success code (0) for normal shutdowns (SIGTERM, SIGINT)
    // This prevents exit code 130 on Ctrl+C
    const exitCode = signal === "UNCAUGHT_EXCEPTION" || signal === "UNHANDLED_REJECTION" ? 1 : 0;
    process.exit(exitCode);
  }
  catch (error) {
    logger.error({ signal, error }, "Error during shutdown");
    clearTimeout(forceExitTimeout);
    process.exit(1);
  }
}

// Handle termination signals (Ctrl+C, kill command, etc.)
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  handleUncaughtException(error);
  shutdown("UNCAUGHT_EXCEPTION");
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  handleUnhandledRejection(reason, promise);
  shutdown("UNHANDLED_REJECTION");
});
