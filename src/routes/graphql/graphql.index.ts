// src/routes/graphql/graphql.index.ts
import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginLandingPageProductionDefault } from "@apollo/server/plugin/landingPage/default";

import db from "@/db";
import env from "@/env";
import { startServerAndCreateHonoHandler } from "@/lib/apollo-server-hono-integration";
import { AuthService, extractBearerToken } from "@/lib/auth";
import { createRouter } from "@/lib/create-app";
import { graphqlRateLimiter } from "@/middlewares/rate-limiter";
import { formatUserForGraphQL, getUserWithTimestamps } from "@/utils/time";

import { schema } from "./graphql.schema";

const router = createRouter();

// Apollo Server for HTTP GraphQL
const server = new ApolloServer({
  schema,
  introspection: true,
  plugins: [
    ApolloServerPluginLandingPageProductionDefault({
      graphRef: "my-graph-id@my-graph-variant",
      footer: false,
      embed: false,
      includeCookies: false,
    }),
  ],
});

const graphqlHandler = startServerAndCreateHonoHandler(server, {
  context: async ({ req, c }) => {
    try {
      let user = null;
      const authHeader = req.header("authorization");
      if (authHeader) {
        try {
          user = await getUserFromToken(authHeader);
        }
        catch (error) {
          console.error("Auth error (continuing):", error instanceof Error ? error.message : String(error));
          user = null;
        }
      }

      return {
        db,
        user,
        honoContext: c,
      };
    }
    catch (error) {
      console.error("Error creating GraphQL context:", error);
      throw error;
    }
  },
});

router.all("/graphql", graphqlRateLimiter, graphqlHandler);

// Optional: Serve GraphQL Playground in development
if (env.NODE_ENV === "development") {
  router.get("/playground", async (c) => {
    const playgroundHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>GraphQL Playground</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/graphql-playground-react/build/static/css/index.css" />
          <link rel="shortcut icon" href="https://cdn.jsdelivr.net/npm/graphql-playground-react/build/favicon.png" />
          <script src="https://cdn.jsdelivr.net/npm/graphql-playground-react/build/static/js/middleware.js"></script>
        </head>
        <body>
          <div id="root"></div>
          <script>
            window.addEventListener('load', function (event) {
              GraphQLPlayground.init(document.getElementById('root'), {
                endpoint: '/graphql'
              })
            })
          </script>
        </body>
      </html>
    `;
    return c.html(playgroundHTML);
  });

  // Serve GraphQL Subscription Tester
  router.get("/subscription-tester", async (c) => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");

    try {
      const htmlPath = path.join(process.cwd(), "graphql-subscription-test.html");
      const html = await fs.readFile(htmlPath, "utf-8");
      return c.html(html);
    }
    catch (error) {
      console.error("Error reading subscription tester HTML:", error);
      return c.text("Subscription tester not found. Make sure graphql-subscription-test.html exists in the project root.", 404);
    }
  });
}

async function getUserFromToken(authHeader: string) {
  try {
    const token = extractBearerToken(authHeader);
    if (!token) {
      return null;
    }

    const payload = AuthService.verifyAccessToken(token);

    if (!payload.isActive) {
      return null;
    }

    const user = await getUserWithTimestamps(payload);

    if (!user) {
      return null;
    }

    return formatUserForGraphQL(user);
  }
  catch (error) {
    console.error("Error verifying auth token:", error);
    return null;
  }
}

export default router;
