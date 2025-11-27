// src/routes/graphql/graphql.index.ts
import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginLandingPageProductionDefault } from "@apollo/server/plugin/landingPage/default";

import db from "@/db";
import { startServerAndCreateHonoHandler } from "@/lib/apollo-server-hono-integration";
import { createRouter } from "@/lib/create-app";
import { logger } from "@/middlewares/pino-logger";
import { graphqlRateLimiter } from "@/middlewares/rate-limiter";
import { getUserFromToken } from "@/utils/auth-helpers";

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
      const authHeader = req.header("authorization");
      const user = await getUserFromToken(authHeader);

      return {
        db,
        user,
        honoContext: c,
        logger,
      };
    }
    catch (error) {
      console.error("Error creating GraphQL context:", error);
      throw error;
    }
  },
});

router.all("/graphql", graphqlRateLimiter, graphqlHandler);

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
    return c.text(
      "Subscription tester not found. Make sure graphql-subscription-test.html exists in the project root.",
      404,
    );
  }
});

export default router;
