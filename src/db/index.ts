import { drizzle } from "drizzle-orm/libsql";

import env from "@/env";

import * as schema from "./schema";

const db = drizzle({
  connection: {
    url: env.DATABASE_URL,
    authToken: env.DATABASE_AUTH_TOKEN,
    ...(env.NODE_ENV === "production" && {
      syncUrl: env.DATABASE_URL, // Enable sync for better performance in production(TODO: use a different sync database for production)
    }),
  },
  casing: "snake_case",
  schema,
  logger: env.NODE_ENV === "development" ? true : undefined,
});

export default db;
