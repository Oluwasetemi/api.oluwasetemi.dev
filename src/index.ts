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
