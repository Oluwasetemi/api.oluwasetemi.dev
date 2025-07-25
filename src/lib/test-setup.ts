import { drizzle } from "drizzle-orm/libsql";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { requests, tasks, users } from "@/db/schema";
import * as schema from "@/db/schema";
import env from "@/env";

export async function setupTestDatabase() {
  // Generate a unique test database name for better isolation
  const testDbName = `test.db`;
  const testDbPath = path.join(process.cwd(), testDbName);

  // Set the database URL for this test
  env.DATABASE_URL = `file:${testDbPath}`;

  try {
    // Run migrations
    execSync("pnpm drizzle-kit push", { stdio: "pipe" });

    // Create a new database connection for this test
    const testDb = drizzle({
      connection: {
        url: `file:${testDbPath}`,
      },
      casing: "snake_case",
      schema,
    });

    // Clear any existing data - order matters due to foreign key constraints
    // Handle missing tables gracefully during test setup
    try {
      await testDb.delete(requests).run();
    }
    catch {
      // Table might not exist yet, ignore
    }

    try {
      await testDb.delete(tasks).run();
    }
    catch {
      // Table might not exist yet, ignore
    }

    try {
      await testDb.delete(users).run();
    }
    catch {
      // Table might not exist yet, ignore
    }

    return testDbPath;
  }
  catch (error) {
    console.error("Failed to setup test database:", error);
    throw error;
  }
}

export async function cleanupTestDatabase(testDbPath?: string) {
  if (testDbPath && fs.existsSync(testDbPath)) {
    try {
      // dropDatabaseTableData(testDbPath);
      fs.rmSync(testDbPath, { force: true });
    }
    catch (error) {
      console.warn("Failed to cleanup test database:", error);
    }
  }

  // Clean up any leftover test database files
  try {
    const files = fs.readdirSync(process.cwd());
    for (const file of files) {
      if (file.startsWith("test-") && file.endsWith(".db")) {
        fs.rmSync(path.join(process.cwd(), file), { force: true });
      }
    }
  }
  catch (error) {
    console.warn("Failed to cleanup leftover test databases:", error);
  }
}
