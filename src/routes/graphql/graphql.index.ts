// src/routes/graphql/graphql.index.ts
import { ApolloServer } from "@apollo/server";
import { makeExecutableSchema, mergeSchemas } from "@graphql-tools/schema";
import { buildSchema } from "drizzle-graphql";

import db from "@/db";
import env from "@/env";
import { startServerAndCreateHonoHandler } from "@/lib/apollo-server-hono-integration";
import { createRouter } from "@/lib/create-app";
import { graphqlRateLimiter } from "@/middlewares/rate-limiter";
import { getCounts } from "@/services/analytics.service";

// 1. Build the auto-generated schema
const { schema: drizzleSchema } = buildSchema(db);

// 2. Define your custom typeDefs and resolvers
const typeDefs = `
  type Query {
    hello: String!
    countRequests(
      from: String
      to: String
      path: String
      method: String
      groupBy: String
    ): CountsResult!
  }
  type Mutation {
    sayHello(input: String!): String!
  }
  type CountsResult {
    total: Int!
    data: [GroupedCount!]!
    groupedBy: String
  }
  type GroupedCount {
    key: String!
    count: Int!
  }
`;

const resolvers = {
  Query: {
    hello: () => "Hello, world!",
    countRequests: async (
      _: any,
      args: { from?: string; to?: string; path?: string; method?: string; groupBy?: string },
    ) => {
      return await getCounts(args);
    },
  },
  Mutation: {
    sayHello: async (_: any, { input }: { input: string }) => {
      return `Hello, ${input}!`;
    },
  },
};

// 3. Create a custom schema
const customSchema = makeExecutableSchema({ typeDefs, resolvers });

// 4. Merge schemas
const schema = mergeSchemas({
  schemas: [drizzleSchema, customSchema],
});

// 5. Use this schema in ApolloServer
const server = new ApolloServer({ schema });

const router = createRouter();

const graphqlHandler = startServerAndCreateHonoHandler(server, {
  // eslint-disable-next-line unused-imports/no-unused-vars
  context: async ({ req, c }) => {
    try {
      return {
        db,
        // Add more context properties
        // user: req.header("authorization") ? await getUserFromToken(req.header("authorization")) : null,
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
}

// async function getUserFromToken(authHeader: string) {
//   // Implement your auth logic
//   try {
//     // Example: JWT verification
//     // const token = authHeader.replace('Bearer ', '');
//     // return await verifyJWT(token);
//     return null;
//   }
//   catch (error) {
//     console.error("Error verifying auth token:", error);
//     return null;
//   }
// }

export default router;
