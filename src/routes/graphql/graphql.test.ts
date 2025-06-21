import { describe, it, expect } from "vitest";
import { testClient } from "hono/testing";

import { createTestApp } from "@/lib/create-app";

import router from "./graphql.index";

const client = testClient(createTestApp(router));

describe("graphql route", () => {
  it("handles a simple query", async () => {
    const res = await client.$post("/graphql", {
      json: { query: "{ __schema { queryType { name } } }" },
    });
    expect(res.status).toBe(200);
    if (res.status === 200) {
      const json = await res.json();
      expect(json.data.__schema.queryType.name).toBe("Query");
    }
  });
});
