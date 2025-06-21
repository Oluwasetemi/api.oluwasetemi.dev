// src/routes/graphql/graphql.index.ts
import { ApolloServer } from "@apollo/server";
import { buildSchema } from "drizzle-graphql";

import db from "@/db";
import { startServerAndCreateHonoHandler } from "@/lib/apollo-server-hono-integration";
import { createRouter } from "@/lib/create-app";

const { schema } = buildSchema(db);

const server = new ApolloServer({
  schema,
  // Optional: Add plugins for better development experience
  introspection: process.env.NODE_ENV === "development",
  plugins: [
    // Add any Apollo Server plugins you need
  ],
});

const router = createRouter();

const graphqlHandler = startServerAndCreateHonoHandler(server, {
  context: async ({ req, c }) => {
    try {
      return {
        db,
        // Add more context properties
        user: req.header("authorization") ? await getUserFromToken(req.header("authorization")) : null,
        // You can access the full Hono context if needed
        honoContext: c,
      };
    }
    catch (error) {
      console.error("Error creating GraphQL context:", error);
      throw error;
    }
  },
});

router.all("/graphql", graphqlHandler);

// Optional: Serve GraphQL Playground in development
if (process.env.NODE_ENV === "development") {
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
}

async function getUserFromToken(authHeader: string) {
  // Implement your auth logic
  try {
    // Example: JWT verification
    // const token = authHeader.replace('Bearer ', '');
    // return await verifyJWT(token);
    return null;
  }
  catch (error) {
    console.error("Error verifying auth token:", error);
    return null;
  }
}

export default router;
