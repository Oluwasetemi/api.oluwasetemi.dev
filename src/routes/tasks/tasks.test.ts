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

const client = testClient(createTestApp(router)) as any;

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
        status: "XXX" as any,
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
        id: 999 as any,
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
        id: 999 as any,
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
        id: 999 as any,
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

  describe("task ownership authorization", () => {
    let user1Token: string;
    let user2Token: string;
    let user1TaskId: string;
    let unownedTaskId: string;

    let fullApp: any;

    // Helper function to create authenticated client
    const createAuthClient = (token: string) => ({
      tasks: {
        "$post": async (args: { json: any }) => {
          return fullApp.request("/tasks", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify(args.json),
          });
        },
        ":id": {
          $patch: async (args: { param: { id: string }; json: any }) => {
            return fullApp.request(`/tasks/${args.param.id}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
              },
              body: JSON.stringify(args.json),
            });
          },
          $delete: async (args: { param: { id: string } }) => {
            return fullApp.request(`/tasks/${args.param.id}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });
          },
        },
      },
    });

    beforeAll(async () => {
      // Create test app that includes auth routes for user registration/login
      fullApp = (await import("@/app")).default;

      // Register and login two test users
      const user1Email = `user1-${Date.now()}@example.com`;
      const user2Email = `user2-${Date.now()}@example.com`;

      // Register User 1
      const user1RegisterResponse = await fullApp.request("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user1Email,
          password: "Password123!",
          name: "User One",
        }),
      });
      const user1Data = await user1RegisterResponse.json();
      user1Token = user1Data.accessToken;

      // Register User 2
      const user2RegisterResponse = await fullApp.request("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user2Email,
          password: "Password123!",
          name: "User Two",
        }),
      });
      const user2Data = await user2RegisterResponse.json();
      user2Token = user2Data.accessToken;

      // Create a task with User 1's authentication (should have owner)
      const authClient1 = createAuthClient(user1Token);
      const user1TaskResponse = await authClient1.tasks.$post({
        json: {
          name: "User 1 Owned Task",
          status: "TODO",
        },
      });
      const user1TaskData = await user1TaskResponse.json();
      user1TaskId = user1TaskData.id;

      // Create an unowned task (without authentication)
      const unownedTaskResponse = await fullApp.request("/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Unowned Task",
          status: "TODO",
        }),
      });
      const unownedTaskData = await unownedTaskResponse.json();
      unownedTaskId = unownedTaskData.id;
    });

    describe("task creation", () => {
      it("creates task without owner when not authenticated", async () => {
        const response = await fullApp.request("/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "No Auth Task",
            status: "TODO",
          }),
        });

        expect(response.status).toBe(200);
        const task = await response.json();
        expect(task.owner).toBeNull();
        expect(task.name).toBe("No Auth Task");
      });

      it("creates task with owner when authenticated", async () => {
        const authClient = createAuthClient(user1Token);
        const response = await authClient.tasks.$post({
          json: {
            name: "Authenticated Task",
            status: "TODO",
          },
        });

        expect(response.status).toBe(200);
        const task = await response.json();
        expect(task.owner).toBeDefined();
        expect(task.owner).not.toBeNull();
        expect(task.name).toBe("Authenticated Task");
      });
    });

    describe("task updates", () => {
      it("allows anyone to update unowned tasks", async () => {
        const response = await fullApp.request(`/tasks/${unownedTaskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "IN_PROGRESS" }),
        });

        expect(response.status).toBe(200);
        const task = await response.json();
        expect(task.status).toBe("IN_PROGRESS");
      });

      it("allows authenticated updates to unowned tasks", async () => {
        const authClient = createAuthClient(user1Token);
        const response = await authClient.tasks[":id"].$patch({
          param: { id: unownedTaskId },
          json: { status: "DONE" },
        });

        expect(response.status).toBe(200);
        const task = await response.json();
        expect(task.status).toBe("DONE");
      });

      it("rejects unauthenticated updates to owned tasks", async () => {
        const response = await fullApp.request(`/tasks/${user1TaskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "IN_PROGRESS" }),
        });

        expect(response.status).toBe(401);
        const error = await response.json();
        expect(error.message).toBe("Authentication required to update this task");
      });

      it("allows owner to update their own task", async () => {
        const authClient = createAuthClient(user1Token);
        const response = await authClient.tasks[":id"].$patch({
          param: { id: user1TaskId },
          json: { status: "IN_PROGRESS" },
        });

        expect(response.status).toBe(200);
        const task = await response.json();
        expect(task.status).toBe("IN_PROGRESS");
      });

      it("prevents non-owner from updating owned task", async () => {
        const authClient2 = createAuthClient(user2Token);
        const response = await authClient2.tasks[":id"].$patch({
          param: { id: user1TaskId },
          json: { status: "DONE" },
        });

        expect(response.status).toBe(403);
        const error = await response.json();
        expect(error.message).toBe("You can only update tasks you own");
      });
    });

    describe("task deletion", () => {
      let user1DeleteTaskId: string;
      let unownedDeleteTaskId: string;

      beforeAll(async () => {
        // Create tasks for deletion tests
        const authClient1 = createAuthClient(user1Token);
        const user1DeleteTaskResponse = await authClient1.tasks.$post({
          json: {
            name: "User 1 Delete Task",
            status: "TODO",
          },
        });
        const user1DeleteTaskData = await user1DeleteTaskResponse.json();
        user1DeleteTaskId = user1DeleteTaskData.id;

        const unownedDeleteTaskResponse = await fullApp.request("/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Unowned Delete Task",
            status: "TODO",
          }),
        });
        const unownedDeleteTaskData = await unownedDeleteTaskResponse.json();
        unownedDeleteTaskId = unownedDeleteTaskData.id;
      });

      it("allows anyone to delete unowned tasks", async () => {
        const response = await fullApp.request(`/tasks/${unownedDeleteTaskId}`, {
          method: "DELETE",
        });

        expect(response.status).toBe(204);
      });

      it("rejects unauthenticated deletion of owned tasks", async () => {
        const response = await fullApp.request(`/tasks/${user1DeleteTaskId}`, {
          method: "DELETE",
        });

        expect(response.status).toBe(401);
        const error = await response.json();
        expect(error.message).toBe("Authentication required to delete this task");
      });

      it("allows owner to delete their own task", async () => {
        const authClient1 = createAuthClient(user1Token);
        const response = await authClient1.tasks[":id"].$delete({
          param: { id: user1DeleteTaskId },
        });

        expect(response.status).toBe(204);
      });

      it("prevents non-owner from deleting owned task", async () => {
        // First create another task for User 1
        const authClient1 = createAuthClient(user1Token);
        const taskResponse = await authClient1.tasks.$post({
          json: {
            name: "Another User 1 Task",
            status: "TODO",
          },
        });
        const taskData = await taskResponse.json();

        // Try to delete with User 2's token
        const authClient2 = createAuthClient(user2Token);
        const response = await authClient2.tasks[":id"].$delete({
          param: { id: taskData.id },
        });

        expect(response.status).toBe(403);
        const error = await response.json();
        expect(error.message).toBe("You can only delete tasks you own");
      });
    });

    describe("edge cases", () => {
      it("handles invalid bearer token gracefully", async () => {
        const response = await fullApp.request("/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer invalid-token",
          },
          body: JSON.stringify({
            name: "Invalid Token Task",
            status: "TODO",
          }),
        });

        // Should create task without owner (optional auth fails gracefully)
        expect(response.status).toBe(200);
        const task = await response.json();
        expect(task.owner).toBeNull();
      });

      it("handles malformed authorization header gracefully", async () => {
        const response = await fullApp.request("/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "NotBearer token",
          },
          body: JSON.stringify({
            name: "Malformed Auth Task",
            status: "TODO",
          }),
        });

        // Should create task without owner (optional auth fails gracefully)
        expect(response.status).toBe(200);
        const task = await response.json();
        expect(task.owner).toBeNull();
      });

      it("handles expired token gracefully", async () => {
        // Use a token that's clearly expired (JWT with exp in the past)
        const expiredToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiZXhwIjoxfQ.invalid";

        const response = await fullApp.request("/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${expiredToken}`,
          },
          body: JSON.stringify({
            name: "Expired Token Task",
            status: "TODO",
          }),
        });

        // Should create task without owner (optional auth fails gracefully)
        expect(response.status).toBe(200);
        const task = await response.json();
        expect(task.owner).toBeNull();
      });
    });
  });
});
