/* eslint-disable ts/ban-ts-comment */
import { testClient } from "hono/testing";
import * as HttpStatusPhrases from "stoker/http-status-phrases";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import { ZodIssueCode } from "zod";

import env from "@/env";
import { ZOD_ERROR_CODES, ZOD_ERROR_MESSAGES } from "@/lib/constants";
import { createTestApp } from "@/lib/create-app";
import { cleanupTestDatabase, setupTestDatabase } from "@/lib/test-setup";

import router from "./tasks.index";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

const client = testClient(createTestApp(router));

describe("tasks routes", () => {
  let testDbPath: string;

  beforeAll(async () => {
    testDbPath = await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase(testDbPath);
  });

  it("post /tasks validates the body when creating", async () => {
    const response = await client.tasks.$post({
      json: {
        // @ts-expect-error
        status: "XXX",
      },
    });
    expect(response.status).toBe(422);
    if (response.status === 422) {
      const json = await response.json();
      expect(json.error.issues[0].path[0]).toBe("name");
      expect(json.error.issues[0].message).toBe(ZOD_ERROR_MESSAGES.REQUIRED);
    }
  });

  let id = crypto.randomUUID();
  const name = "Learn vitest";

  it("post /tasks creates a task", async () => {
    const response = await client.tasks.$post({
      json: {
        name,
        status: "TODO",
      },
    });

    expect(response.status).toBe(200);
    if (response.status === 200) {
      const json = await response.json();

      id = json.id as `${string}-${string}-${string}-${string}-${string}`;
      expect(json.name).toBe(name);
      expect(json.status).toBe("TODO");
    }
  });

  it("get /tasks lists all tasks", async () => {
    const response = await client.tasks.$get({
      query: {
        all: true,
      },
    });
    expect(response.status).toBe(200);
    if (response.status === 200) {
      const json = await response.json();

      expect(Array.isArray(json)).toBe(true);
      if (Array.isArray(json)) {
        expect(json.length).toBeGreaterThan(0);
      }
    }
  });

  it("get /tasks filters by status", async () => {
    const response = await client.tasks.$get({
      query: {
        status: "TODO",
        all: true,
      },
    });
    expect(response.status).toBe(200);
    if (response.status === 200) {
      const json = await response.json();
      expect(Array.isArray(json)).toBe(true);
      if (Array.isArray(json)) {
        expect(json.every(task => task.status === "TODO")).toBe(true);
      }
    }
  });

  it("get /tasks filters by priority", async () => {
    const response = await client.tasks.$get({
      query: {
        priority: "MEDIUM",
        all: true,
      },
    });
    expect(response.status).toBe(200);
    if (response.status === 200) {
      const json = await response.json();
      expect(Array.isArray(json)).toBe(true);
      if (Array.isArray(json)) {
        expect(json.every(task => task.priority === "MEDIUM")).toBe(true);
      }
    }
  });

  it("get /tasks searches by name and description", async () => {
    // First create a task with a unique name
    const uniqueName = `Test Search ${crypto.randomUUID()}`;
    await client.tasks.$post({
      json: {
        name: uniqueName,
        description: "This is a test search task",
        status: "TODO",
      },
    });

    const response = await client.tasks.$get({
      query: {
        search: uniqueName,
        all: true,
      },
    });
    expect(response.status).toBe(200);
    if (response.status === 200) {
      const json = await response.json();
      expect(Array.isArray(json)).toBe(true);
      if (Array.isArray(json)) {
        expect(json.some(task => task.name === uniqueName)).toBe(true);
      }
    }
  });

  it("get /tasks sorts by createdAt in ascending order", async () => {
    const response = await client.tasks.$get({
      query: {
        sort: "ASC",
        all: true,
      },
    });
    expect(response.status).toBe(200);
    if (response.status === 200) {
      const json = await response.json();
      expect(Array.isArray(json)).toBe(true);
      if (Array.isArray(json)) {
        const dates = json.map(task => new Date(task.createdAt as string).getTime());
        expect(dates).toEqual([...dates].sort((a, b) => a - b));
      }
    }
  });

  it("get /tasks sorts by createdAt in descending order by default", async () => {
    const response = await client.tasks.$get({
      query: {
        all: true,
      },
    });
    expect(response.status).toBe(200);
    if (response.status === 200) {
      const json = await response.json();
      expect(Array.isArray(json)).toBe(true);
      if (Array.isArray(json)) {
        const dates = json.map(task => new Date(task.createdAt as string).getTime());
        expect(dates).toEqual([...dates].sort((a, b) => b - a));
      }
    }
  });

  it("get /tasks combines filters, search, and sorting", async () => {
    const response = await client.tasks.$get({
      query: {
        status: "TODO",
        priority: "MEDIUM",
        search: "test",
        sort: "ASC",
        all: true,
      },
    });
    expect(response.status).toBe(200);
    if (response.status === 200) {
      const json = await response.json();
      expect(Array.isArray(json)).toBe(true);
      if (Array.isArray(json)) {
        expect(json.every(task => task.status === "TODO" && task.priority === "MEDIUM")).toBe(true);
        const dates = json.map(task => new Date(task.createdAt as string).getTime());
        expect(dates).toEqual([...dates].sort((a, b) => a - b));
      }
    }
  });

  // TODO: test the pagination

  it("get /tasks/{id} validates the id param", async () => {
    const response = await client.tasks[":id"].$get({
      param: {
        // @ts-expect-error
        id: 999,
      },
    });

    expect(response.status).toBe(422);

    if (response.status === 422) {
      const json = await response.json();
      expect(json.error.issues[0].path[0]).toBe("id");
      expect(json.error.issues[0].message).toBe(
        ZOD_ERROR_MESSAGES.INVALID_UUID,
      );
    }
  });

  it("get /tasks/{id} returns 404 when task not found", async () => {
    const response = await client.tasks[":id"].$get({
      param: {
        id: crypto.randomUUID(),
      },
    });
    expect(response.status).toBe(404);
    if (response.status === 404) {
      const json = await response.json();
      expect(json.message).toBe(HttpStatusPhrases.NOT_FOUND);
    }
  });

  it("get /tasks/{id} gets a single task", async () => {
    const response = await client.tasks[":id"].$get({
      param: {
        id: id.toString(),
      },
    });
    expect(response.status).toBe(200);
    if (response.status === 200) {
      const json = await response.json();
      expect(json.name).toBe(name);
      expect(json.status).toBe("TODO");
    }
  });

  // TODO: test the children routes

  it("patch /tasks/{id} validates the body when updating", async () => {
    const response = await client.tasks[":id"].$patch({
      param: {
        id: id.toString(),
      },
      json: {
        name: "",
      },
    });
    expect(response.status).toBe(422);
    if (response.status === 422) {
      const json = await response.json();
      expect(json.error.issues[0].path[0]).toBe("name");
      expect(json.error.issues[0].code).toBe(ZodIssueCode.too_small);
    }
  });

  it("patch /tasks/{id} validates the id param", async () => {
    const response = await client.tasks[":id"].$patch({
      param: {
        // @ts-expect-error
        id: 999,
      },
      json: {},
    });
    expect(response.status).toBe(422);
    if (response.status === 422) {
      const json = await response.json();
      expect(json.error.issues[0].path[0]).toBe("id");
      expect(json.error.issues[0].message).toBe(
        ZOD_ERROR_MESSAGES.INVALID_UUID,
      );
    }
  });

  it("patch /tasks/{id} validates empty body", async () => {
    const response = await client.tasks[":id"].$patch({
      param: {
        id: id.toString(),
      },
      json: {},
    });
    expect(response.status).toBe(422);
    if (response.status === 422) {
      const json = await response.json();
      expect(json.error.issues[0].code).toBe(ZOD_ERROR_CODES.INVALID_UPDATES);
      expect(json.error.issues[0].message).toBe(ZOD_ERROR_MESSAGES.NO_UPDATES);
    }
  });

  it("patch /tasks/{id} updates a single property of a task", async () => {
    const response = await client.tasks[":id"].$patch({
      param: {
        id: id.toString(),
      },
      json: {
        status: "DONE",
      },
    });
    expect(response.status).toBe(200);
    if (response.status === 200) {
      const json = await response.json();
      expect(json.status).toBe("DONE");
    }
  });

  it("delete /tasks/{id} validates the id when deleting", async () => {
    const response = await client.tasks[":id"].$delete({
      param: {
        // @ts-expect-error
        id: 999,
      },
    });
    expect(response.status).toBe(422);
    if (response.status === 422) {
      const json = await response.json();
      expect(json.error.issues[0].path[0]).toBe("id");
      expect(json.error.issues[0].message).toBe(
        ZOD_ERROR_MESSAGES.INVALID_UUID,
      );
    }
  });

  it("delete /tasks/{id} removes a task", async () => {
    const response = await client.tasks[":id"].$delete({
      param: {
        id,
      },
    });
    expect(response.status).toBe(204);
  });
});
