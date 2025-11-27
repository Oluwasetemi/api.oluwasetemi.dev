// Shared GraphQL schema for HTTP and WebSocket handlers
import { makeExecutableSchema, mergeSchemas } from "@graphql-tools/schema";
import { buildSchema } from "drizzle-graphql";

import db from "@/db";
import { users } from "@/db/schema";
import { AuthService } from "@/lib/auth";
import { pubsub, SUBSCRIPTION_EVENTS } from "@/lib/pubsub";
import { getCounts } from "@/services/analytics.service";
import { formatUserForGraphQL } from "@/utils/time";

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
    register(email: String!, password: String!, name: String, image: String): AuthResponse!
    login(email: String!, password: String!): AuthResponse!
    refreshToken(refreshToken: String!): TokenResponse!
  }
  type Subscription {
    taskCreated: TaskSubscriptionPayload!
    taskUpdated: TaskSubscriptionPayload!
    taskDeleted: TaskDeletedPayload!
    productCreated: ProductSubscriptionPayload!
    productUpdated: ProductSubscriptionPayload!
    productDeleted: ProductDeletedPayload!
    postCreated: PostSubscriptionPayload!
    postUpdated: PostSubscriptionPayload!
    postDeleted: PostDeletedPayload!
    postPublished: PostSubscriptionPayload!
  }
  type User {
    id: ID!
    email: String!
    name: String
    image: String
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
  type TaskSubscriptionPayload {
    id: ID!
    name: String!
    description: String
    status: String!
    priority: String!
    createdAt: String!
    updatedAt: String!
  }
  type TaskDeletedPayload {
    id: ID!
  }
  type ProductSubscriptionPayload {
    id: ID!
    name: String!
    description: String
    price: Float!
    sku: String
    createdAt: String!
    updatedAt: String!
  }
  type ProductDeletedPayload {
    id: ID!
  }
  type PostSubscriptionPayload {
    id: ID!
    title: String!
    slug: String!
    content: String
    status: String!
    createdAt: String!
    updatedAt: String!
  }
  type PostDeletedPayload {
    id: ID!
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
    register: async (_: any, { email, password, name, image }: {
      email: string;
      password: string;
      name?: string;
      image?: string;
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
          name: name || "",
          image: image || null,
        })
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          image: users.image,
          isActive: users.isActive,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        });

      const tokenPayload = {
        userId: newUser.id,
        email: newUser.email,
        name: newUser.name,
        image: newUser.image,
        isActive: newUser.isActive,
      };
      const accessToken = await AuthService.generateAccessToken(tokenPayload);
      const refreshToken = await AuthService.generateRefreshToken(tokenPayload);

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

      const isValid = await AuthService.verifyPassword(password, user.password || "");
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
        image: updatedUser.image,
        isActive: updatedUser.isActive,
      };
      const accessToken = await AuthService.generateAccessToken(tokenPayload);
      const refreshToken = await AuthService.generateRefreshToken(tokenPayload);

      return {
        user: formatUserForGraphQL(updatedUser),
        accessToken,
        refreshToken,
      };
    },
    refreshToken: async (_: any, { refreshToken }: { refreshToken: string }) => {
      try {
        const payload = await AuthService.verifyRefreshToken(refreshToken);

        const user = await AuthService.findUserById(payload.userId);
        if (!user || !user.isActive) {
          throw new Error("Invalid user");
        }

        const tokenPayload = {
          userId: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          isActive: user.isActive,
        };
        const newAccessToken = await AuthService.generateAccessToken(tokenPayload);
        const newRefreshToken = await AuthService.generateRefreshToken(tokenPayload);

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
  Subscription: {
    // Task subscriptions
    taskCreated: {
      subscribe: () => pubsub.asyncIterableIterator([SUBSCRIPTION_EVENTS.TASK_CREATED]),
    },
    taskUpdated: {
      subscribe: () => pubsub.asyncIterableIterator([SUBSCRIPTION_EVENTS.TASK_UPDATED]),
    },
    taskDeleted: {
      subscribe: () => pubsub.asyncIterableIterator([SUBSCRIPTION_EVENTS.TASK_DELETED]),
    },
    // Product subscriptions
    productCreated: {
      subscribe: () => pubsub.asyncIterableIterator([SUBSCRIPTION_EVENTS.PRODUCT_CREATED]),
    },
    productUpdated: {
      subscribe: () => pubsub.asyncIterableIterator([SUBSCRIPTION_EVENTS.PRODUCT_UPDATED]),
    },
    productDeleted: {
      subscribe: () => pubsub.asyncIterableIterator([SUBSCRIPTION_EVENTS.PRODUCT_DELETED]),
    },
    // Post subscriptions
    postCreated: {
      subscribe: () => pubsub.asyncIterableIterator([SUBSCRIPTION_EVENTS.POST_CREATED]),
    },
    postUpdated: {
      subscribe: () => pubsub.asyncIterableIterator([SUBSCRIPTION_EVENTS.POST_UPDATED]),
    },
    postDeleted: {
      subscribe: () => pubsub.asyncIterableIterator([SUBSCRIPTION_EVENTS.POST_DELETED]),
    },
    postPublished: {
      subscribe: () => pubsub.asyncIterableIterator([SUBSCRIPTION_EVENTS.POST_PUBLISHED]),
    },
  },
};

const customSchema = makeExecutableSchema({ typeDefs, resolvers });

export const schema = mergeSchemas({
  schemas: [drizzleSchema, customSchema],
});
