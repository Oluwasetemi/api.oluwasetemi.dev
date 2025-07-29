import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";

import env from "@/env";

import * as schema from "./schema";

// Validate DATABASE_URL format before attempting connection
function validateDatabaseUrl(url: string): void {
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  if (url.includes(" ")) {
    throw new Error("DATABASE_URL contains spaces - this is invalid");
  }

  let dbPath: string;
  if (url.startsWith("file:")) {
    dbPath = url.replace("file:", "");
  }
  else {
    dbPath = url;
  }

  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database file not found: ${dbPath}`);
  }
}

try {
  validateDatabaseUrl(env.DATABASE_URL);
}
catch (error) {
  console.error("❌ Database connection failed:");
  console.error(`DATABASE_URL: ${env.DATABASE_URL}`);
  console.error(`Error: ${error instanceof Error ? error.message : error}`);

  if (env.NODE_ENV === "production") {
    console.error("💡 Production troubleshooting:");
    console.error("   1. Verify DATABASE_URL format: path/to/database.db or file:database.db");
    console.error("   2. Ensure database file is writable");
    console.error("   3. Check file path permissions");
  }

  throw error;
}

let dbPath: string;
if (env.DATABASE_URL.startsWith("file:")) {
  dbPath = env.DATABASE_URL.replace("file:", "");
}
else {
  dbPath = env.DATABASE_URL;
}

const sqlite = new Database(dbPath);

if (env.NODE_ENV === "production") {
  sqlite.pragma("journal_mode = WAL");
}

const db = drizzle(sqlite, {
  casing: "snake_case",
  schema,
  logger: env.NODE_ENV === "development" ? true : undefined,
});

export default db;
