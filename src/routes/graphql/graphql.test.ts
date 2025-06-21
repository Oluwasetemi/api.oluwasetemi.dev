import { testClient } from "hono/testing";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import env from "@/env";
import { createTestApp } from "@/lib/create-app";

import router from "./graphql.index";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

const client = testClient(createTestApp(router));

describe("graphql route", () => {
  beforeAll(async () => {
    execSync("pnpm drizzle-kit push");
  });

  afterAll(async () => {
    fs.rmSync("test.db", { force: true });
  });

  it("handles a simple query", async () => {
    const res = await client.graphql.$post({
      json: { query: "{ __schema { queryType { name } } }" },
    });
    expect(res.status).toBe(200);
    if (res.status === 200) {
      const json = await res.json();
      expect(json.data.__schema.queryType.name).toBe("Query");
    }
  });
});
