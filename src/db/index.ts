import { drizzle } from "drizzle-orm/libsql";

import env from "@/env";

import * as schema from "./schema";

const db = drizzle({
  connection: {
    url: env.DATABASE_URL,
    authToken: env.DATABASE_AUTH_TOKEN,
    // Connection pool optimizations for better performance
    ...(env.NODE_ENV === "production" && {
      // Production-only connection optimizations
      syncUrl: env.DATABASE_URL, // Enable sync for better performance in production
    }),
  },
  casing: "snake_case",
  schema,
  // Performance optimizations for database connections
  logger: env.NODE_ENV === "development" ? false : undefined, // Disable logging in dev for performance
});

export default db;
