// src/routes/graphql/graphql.index.ts
import { ApolloServer } from "@apollo/server";
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
      // Normalize and validate email
      const normalizedEmail = AuthService.normalizeEmail(email);

      // Validate password strength
      const passwordValidation = AuthService.validatePassword(password);
      if (!passwordValidation.isValid) {
        throw new Error(`Password validation failed: ${passwordValidation.errors.join(", ")}`);
      }

      // Check if user already exists
      const existingUser = await AuthService.findUserByEmail(normalizedEmail);
      if (existingUser) {
        throw new Error("Email already exists");
      }

      // Hash password
      const hashedPassword = await AuthService.hashPassword(password);

      // Create user
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

      // Generate tokens with user data
      const tokenPayload = {
        userId: newUser.id,
        email: newUser.email,
        name: newUser.name,
        imageUrl: newUser.imageUrl,
        isActive: newUser.isActive,
      };
      const accessToken = AuthService.generateAccessToken(tokenPayload);
      const refreshToken = AuthService.generateRefreshToken(tokenPayload);

      // Update last login
      await AuthService.updateLastLogin(newUser.id);

      return {
        user: newUser,
        accessToken,
        refreshToken,
      };
    },
    login: async (_: any, { email, password }: { email: string; password: string }) => {
      // Normalize email
      const normalizedEmail = AuthService.normalizeEmail(email);

      // Find user with password
      const user = await AuthService.findUserByEmail(normalizedEmail);
      if (!user || !user.isActive) {
        throw new Error("Invalid credentials");
      }

      // Verify password
      const isValid = await AuthService.verifyPassword(password, user.password);
      if (!isValid) {
        throw new Error("Invalid credentials");
      }

      // Generate tokens with user data
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        name: user.name,
        imageUrl: user.imageUrl,
        isActive: user.isActive,
      };
      const accessToken = AuthService.generateAccessToken(tokenPayload);
      const refreshToken = AuthService.generateRefreshToken(tokenPayload);

      // Update last login
      await AuthService.updateLastLogin(user.id);

      // Remove password from response
      const { password: _pwd, ...userWithoutPassword } = user;

      return {
        user: {
          ...userWithoutPassword,
          lastLoginAt: userWithoutPassword.lastLoginAt ? userWithoutPassword.lastLoginAt.toISOString() : null,
          createdAt: userWithoutPassword.createdAt ? userWithoutPassword.createdAt.toISOString() : null,
          updatedAt: userWithoutPassword.updatedAt ? userWithoutPassword.updatedAt.toISOString() : null,
        },
        accessToken,
        refreshToken,
      };
    },
    refreshToken: async (_: any, { refreshToken }: { refreshToken: string }) => {
      try {
        // Verify refresh token
        const payload = AuthService.verifyRefreshToken(refreshToken);

        // Check if user exists and is active
        const user = await AuthService.findUserById(payload.userId);
        if (!user || !user.isActive) {
          throw new Error("Invalid user");
        }

        // Generate new tokens with fresh user data
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

// 3. Create a custom schema
const customSchema = makeExecutableSchema({ typeDefs, resolvers });

// 4. Merge schemas
const schema = mergeSchemas({
  schemas: [drizzleSchema, customSchema],
});

// 5. Use this schema in ApolloServer
const server = new ApolloServer({
  schema,
  introspection: env.NODE_ENV === "development" || env.NODE_ENV === "test",
  // Disable the default landing page to avoid CSP issues
  // plugins: env.NODE_ENV === "production" ? [] : undefined,
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
  // Implement JWT auth logic for GraphQL
  try {
    const token = extractBearerToken(authHeader);
    if (!token) {
      return null;
    }

    const payload = AuthService.verifyAccessToken(token);

    // Check if user is active (cached from JWT)
    if (!payload.isActive) {
      return null;
    }

    // Return user data from JWT (cached, no database lookup needed)
    return {
      id: payload.userId,
      email: payload.email,
      name: payload.name,
      imageUrl: payload.imageUrl,
      isActive: payload.isActive,
      lastLoginAt: null, // Not cached in JWT for security
      createdAt: new Date().toISOString(), // Placeholder
      updatedAt: new Date().toISOString(), // Placeholder
    };
  }
  catch (error) {
    console.error("Error verifying auth token:", error);
    return null;
  }
}

export default router;
