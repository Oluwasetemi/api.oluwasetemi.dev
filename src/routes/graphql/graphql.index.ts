// src/routes/graphql/graphql.index.ts
import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginLandingPageProductionDefault } from "@apollo/server/plugin/landingPage/default";
import { makeExecutableSchema, mergeSchemas } from "@graphql-tools/schema";
import { buildSchema } from "drizzle-graphql";

import db from "@/db";
import { users } from "@/db/schema";
import env from "@/env";
import { startServerAndCreateHonoHandler } from "@/lib/apollo-server-hono-integration";
import { AuthService, extractBearerToken } from "@/lib/auth";
import { createRouter } from "@/lib/create-app";
import { graphqlRateLimiter } from "@/middlewares/rate-limiter";
import { getCounts } from "@/services/analytics.service";
import { formatUserForGraphQL, getUserWithTimestamps } from "@/utils/time";

const { schema: drizzleSchema } = buildSchema(db);

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
    me: User
  }
  type Mutation {
    sayHello(input: String!): String!
    register(email: String!, password: String!, name: String, imageUrl: String): AuthResponse!
    login(email: String!, password: String!): AuthResponse!
    refreshToken(refreshToken: String!): TokenResponse!
  }
  type User {
    id: ID!
    email: String!
    name: String
    imageUrl: String
    isActive: Boolean!
    lastLoginAt: String
    createdAt: String!
    updatedAt: String!
  }
  type AuthResponse {
    user: User!
    accessToken: String!
    refreshToken: String!
  }
  type TokenResponse {
    accessToken: String!
    refreshToken: String!
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
    me: async (_: any, __: any, context: any) => {
      // Get user from context (requires authentication)
      const user = context.user;
      if (!user) {
        throw new Error("Authentication required");
      }
      return user;
    },
  },
  Mutation: {
    sayHello: async (_: any, { input }: { input: string }) => {
      return `Hello, ${input}!`;
    },
    register: async (_: any, { email, password, name, imageUrl }: {
      email: string;
      password: string;
      name?: string;
      imageUrl?: string;
    }) => {
      const normalizedEmail = AuthService.normalizeEmail(email);

      const passwordValidation = AuthService.validatePassword(password);
      if (!passwordValidation.isValid) {
        throw new Error(`Password validation failed: ${passwordValidation.errors.join(", ")}`);
      }

      const existingUser = await AuthService.findUserByEmail(normalizedEmail);
      if (existingUser) {
        throw new Error("Email already exists");
      }

      const hashedPassword = await AuthService.hashPassword(password);

      const [newUser] = await db
        .insert(users)
        .values({
          email: normalizedEmail,
          password: hashedPassword,
          name: name || null,
          imageUrl: imageUrl || null,
        })
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          imageUrl: users.imageUrl,
          isActive: users.isActive,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        });

      const tokenPayload = {
        userId: newUser.id,
        email: newUser.email,
        name: newUser.name,
        imageUrl: newUser.imageUrl,
        isActive: newUser.isActive,
      };
      const accessToken = AuthService.generateAccessToken(tokenPayload);
      const refreshToken = AuthService.generateRefreshToken(tokenPayload);

      await AuthService.updateLastLogin(newUser.id);

      const updatedUser = await AuthService.findUserById(newUser.id);
      if (!updatedUser) {
        throw new Error("Failed to retrieve updated user data");
      }

      return {
        user: formatUserForGraphQL(updatedUser),
        accessToken,
        refreshToken,
      };
    },
    login: async (_: any, { email, password }: { email: string; password: string }) => {
      const normalizedEmail = AuthService.normalizeEmail(email);

      const user = await AuthService.findUserByEmail(normalizedEmail);
      if (!user || !user.isActive) {
        throw new Error("Invalid credentials");
      }

      const isValid = await AuthService.verifyPassword(password, user.password);
      if (!isValid) {
        throw new Error("Invalid credentials");
      }

      await AuthService.updateLastLogin(user.id);

      const updatedUser = await AuthService.findUserById(user.id);
      if (!updatedUser) {
        throw new Error("Failed to retrieve updated user data");
      }

      const tokenPayload = {
        userId: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        imageUrl: updatedUser.imageUrl,
        isActive: updatedUser.isActive,
      };
      const accessToken = AuthService.generateAccessToken(tokenPayload);
      const refreshToken = AuthService.generateRefreshToken(tokenPayload);

      return {
        user: formatUserForGraphQL(updatedUser),
        accessToken,
        refreshToken,
      };
    },
    refreshToken: async (_: any, { refreshToken }: { refreshToken: string }) => {
      try {
        const payload = AuthService.verifyRefreshToken(refreshToken);

        const user = await AuthService.findUserById(payload.userId);
        if (!user || !user.isActive) {
          throw new Error("Invalid user");
        }

        const tokenPayload = {
          userId: user.id,
          email: user.email,
          name: user.name,
          imageUrl: user.imageUrl,
          isActive: user.isActive,
        };
        const newAccessToken = AuthService.generateAccessToken(tokenPayload);
        const newRefreshToken = AuthService.generateRefreshToken(tokenPayload);

        return {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        };
      }
      catch {
        throw new Error("Invalid refresh token");
      }
    },
  },
};

const customSchema = makeExecutableSchema({ typeDefs, resolvers });

const schema = mergeSchemas({
  schemas: [drizzleSchema, customSchema],
});

// 5. Use this schema in ApolloServer
const server = new ApolloServer({
  schema,
  introspection: true,
  plugins: [
    // Use production landing page that should be compatible with our CSP
    ApolloServerPluginLandingPageProductionDefault({
      footer: false,
      embed: false,
      includeCookies: true,
    }),
  ],
});

const router = createRouter();

const graphqlHandler = startServerAndCreateHonoHandler(server, {

  context: async ({ req, c }) => {
    try {
      // Extract user from JWT token if provided
      let user = null;
      const authHeader = req.header("authorization");
      if (authHeader) {
        try {
          user = await getUserFromToken(authHeader);
        }
        catch (error) {
          // Log the error but don't fail the entire context
          // This allows introspection queries to work even with invalid auth
          console.error("Auth error (continuing):", error instanceof Error ? error.message : String(error));
          user = null;
        }
      }

      return {
        db,
        user,
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

    // Fetch complete user data with actual timestamps
    const user = await getUserWithTimestamps(payload);

    if (!user) {
      return null;
    }

    // Format for GraphQL with proper timestamp conversion
    return formatUserForGraphQL(user);
  }
  catch (error) {
    console.error("Error verifying auth token:", error);
    return null;
  }
}

export default router;
