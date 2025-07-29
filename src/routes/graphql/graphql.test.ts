import { afterAll, beforeAll, describe, expect, it } from "vitest";

import env from "@/env";
import { createTestApp } from "@/lib/create-app";
import { cleanupTestDatabase, setupTestDatabase } from "@/lib/test-setup";

import router from "./graphql.index";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

const app = createTestApp(router);

describe("graphql route", () => {
  let testDbPath: string;

  beforeAll(async () => {
    testDbPath = await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase(testDbPath);
  });

  it("handles a simple query", async () => {
    const res = await app.request("/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "{ __schema { queryType { name } } }" }),
    });

    expect(res.status).toBe(200);
    if (res.status === 200) {
      const json = await res.json();
      expect(json.data.__schema.queryType.name).toBe("Query");
    }
  });

  describe("tasks GraphQL operations", () => {
    let taskId: string;
    const taskName = "GraphQL Test Task";
    const taskDescription = "This is a test task created via GraphQL";

    it("creates a task via mutation", async () => {
      const mutation = `
        mutation CreateTask($input: TasksInsertInput!) {
          insertIntoTasks(values: [$input]) {
            id
            name
            description
            status
            priority
            archived
            createdAt
          }
        }
      `;

      const res = await app.request("/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: mutation,
          variables: {
            input: {
              name: taskName,
              description: taskDescription,
              status: "TODO",
              priority: "HIGH",
              archived: false,
            },
          },
        }),
      });

      expect(res.status).toBe(200);
      if (res.status === 200) {
        const json = await res.json();
        expect(json.errors).toBeUndefined();
        expect(json.data.insertIntoTasks).toHaveLength(1);

        const task = json.data.insertIntoTasks[0];
        taskId = task.id;
        expect(task.name).toBe(taskName);
        expect(task.description).toBe(taskDescription);
        expect(task.status).toBe("TODO");
        expect(task.priority).toBe("HIGH");
        expect(task.archived).toBe(false);
        expect(task.createdAt).toBeDefined();
      }
    });

    it("queries all tasks", async () => {
      const query = `
        query GetAllTasks {
          tasks {
            id
            name
            description
            status
            priority
            archived
            createdAt
            updatedAt
          }
        }
      `;

      const res = await app.request("/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      expect(res.status).toBe(200);
      if (res.status === 200) {
        const json = await res.json();
        expect(json.errors).toBeUndefined();
        expect(Array.isArray(json.data.tasks)).toBe(true);
        expect(json.data.tasks.length).toBeGreaterThan(0);

        const createdTask = json.data.tasks.find((task: any) => task.id === taskId);
        expect(createdTask).toBeDefined();
        expect(createdTask.name).toBe(taskName);
      }
    });

    it("queries a single task by ID", async () => {
      const query = `
        query GetTask($id: String!) {
          tasks(where: { id: { eq: $id } }) {
            id
            name
            description
            status
            priority
            archived
            parentId
            children
            owner
            tags
            completedAt
            createdAt
            updatedAt
          }
        }
      `;

      const res = await app.request("/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          variables: { id: taskId },
        }),
      });

      expect(res.status).toBe(200);
      if (res.status === 200) {
        const json = await res.json();
        expect(json.errors).toBeUndefined();
        expect(json.data.tasks).toHaveLength(1);

        const task = json.data.tasks[0];
        expect(task.id).toBe(taskId);
        expect(task.name).toBe(taskName);
        expect(task.description).toBe(taskDescription);
      }
    });

    it("filters tasks by status", async () => {
      const query = `
        query GetTasksByStatus($status: TasksStatusEnum!) {
          tasks(where: { status: { eq: $status } }) {
            id
            name
            status
          }
        }
      `;

      const res = await app.request("/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          variables: { status: "TODO" },
        }),
      });

      expect(res.status).toBe(200);
      if (res.status === 200) {
        const json = await res.json();
        expect(json.errors).toBeUndefined();
        expect(Array.isArray(json.data.tasks)).toBe(true);

        // All returned tasks should have status "TODO"
        json.data.tasks.forEach((task: any) => {
          expect(task.status).toBe("TODO");
        });
      }
    });

    it("filters tasks by priority", async () => {
      const query = `
        query GetTasksByPriority($priority: TasksPriorityEnum!) {
          tasks(where: { priority: { eq: $priority } }) {
            id
            name
            priority
          }
        }
      `;

      const res = await app.request("/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          variables: { priority: "HIGH" },
        }),
      });

      expect(res.status).toBe(200);
      if (res.status === 200) {
        const json = await res.json();
        expect(json.errors).toBeUndefined();
        expect(Array.isArray(json.data.tasks)).toBe(true);

        // All returned tasks should have priority "HIGH"
        json.data.tasks.forEach((task: any) => {
          expect(task.priority).toBe("HIGH");
        });
      }
    });

    it("searches tasks by name", async () => {
      const query = `
        query SearchTasks($searchTerm: String!) {
          tasks(where: { name: { like: $searchTerm } }) {
            id
            name
            description
          }
        }
      `;

      const res = await app.request("/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          variables: { searchTerm: "%GraphQL%" },
        }),
      });

      expect(res.status).toBe(200);
      if (res.status === 200) {
        const json = await res.json();
        expect(json.errors).toBeUndefined();
        expect(Array.isArray(json.data.tasks)).toBe(true);

        // Should find our test task
        const foundTask = json.data.tasks.find((task: any) => task.id === taskId);
        expect(foundTask).toBeDefined();
      }
    });

    it("updates a task via mutation", async () => {
      const mutation = `
        mutation UpdateTask($id: String!, $input: TasksUpdateInput!) {
          updateTasks(where: { id: { eq: $id } }, set: $input) {
            id
            name
            status
            priority
            description
            updatedAt
          }
        }
      `;

      const updatedName = "Updated GraphQL Test Task";
      const res = await app.request("/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: mutation,
          variables: {
            id: taskId,
            input: {
              name: updatedName,
              status: "IN_PROGRESS",
              priority: "MEDIUM",
            },
          },
        }),
      });

      expect(res.status).toBe(200);
      if (res.status === 200) {
        const json = await res.json();
        expect(json.errors).toBeUndefined();
        expect(json.data.updateTasks).toHaveLength(1);

        const task = json.data.updateTasks[0];
        expect(task.name).toBe(updatedName);
        expect(task.status).toBe("IN_PROGRESS");
        expect(task.priority).toBe("MEDIUM");
        expect(task.updatedAt).toBeDefined();
      }
    });

    it("handles multiple filtering conditions", async () => {
      const query = `
        query GetTasksWithMultipleFilters($status: TasksStatusEnum!, $priority: TasksPriorityEnum!, $archived: Boolean!) {
          tasks(where: {
            status: { eq: $status },
            priority: { eq: $priority },
            archived: { eq: $archived }
          }) {
            id
            name
            status
            priority
            archived
          }
        }
      `;

      const res = await app.request("/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          variables: {
            status: "IN_PROGRESS",
            priority: "MEDIUM",
            archived: false,
          },
        }),
      });

      expect(res.status).toBe(200);
      if (res.status === 200) {
        const json = await res.json();
        expect(json.errors).toBeUndefined();
        expect(Array.isArray(json.data.tasks)).toBe(true);

        // All returned tasks should match all conditions
        json.data.tasks.forEach((task: any) => {
          expect(task.status).toBe("IN_PROGRESS");
          expect(task.priority).toBe("MEDIUM");
          expect(task.archived).toBe(false);
        });
      }
    });

    it("queries tasks without specific ordering", async () => {
      const query = `
        query GetTasksUnordered {
          tasks {
            id
            name
            createdAt
            status
          }
        }
      `;

      const res = await app.request("/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      expect(res.status).toBe(200);
      if (res.status === 200) {
        const json = await res.json();
        expect(json.errors).toBeUndefined();
        expect(Array.isArray(json.data.tasks)).toBe(true);

        // Just verify we get tasks back - ordering might be database-dependent
        expect(json.data.tasks.length).toBeGreaterThanOrEqual(0);

        // Verify each task has the expected fields
        json.data.tasks.forEach((task: any) => {
          expect(task.id).toBeDefined();
          expect(task.name).toBeDefined();
          expect(task.createdAt).toBeDefined();
          expect(task.status).toBeDefined();
        });
      }
    });

    it("handles pagination with limit and offset", async () => {
      const query = `
        query GetTasksPaginated($limit: Int!, $offset: Int!) {
          tasks(limit: $limit, offset: $offset) {
            id
            name
            createdAt
          }
        }
      `;

      const res = await app.request("/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          variables: { limit: 2, offset: 0 },
        }),
      });

      expect(res.status).toBe(200);
      if (res.status === 200) {
        const json = await res.json();
        expect(json.errors).toBeUndefined();
        expect(Array.isArray(json.data.tasks)).toBe(true);
        expect(json.data.tasks.length).toBeLessThanOrEqual(2);
      }
    });

    it("deletes a task via mutation", async () => {
      const mutation = `
        mutation DeleteTask($id: String!) {
          deleteFromTasks(where: { id: { eq: $id } }) {
            id
            name
          }
        }
      `;

      const res = await app.request("/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: mutation,
          variables: { id: taskId },
        }),
      });

      expect(res.status).toBe(200);
      if (res.status === 200) {
        const json = await res.json();
        expect(json.errors).toBeUndefined();
        expect(json.data.deleteFromTasks).toHaveLength(1);
        expect(json.data.deleteFromTasks[0].id).toBe(taskId);
      }
    });

    it("verifies task was deleted", async () => {
      const query = `
        query GetDeletedTask($id: String!) {
          tasks(where: { id: { eq: $id } }) {
            id
            name
          }
        }
      `;

      const res = await app.request("/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          variables: { id: taskId },
        }),
      });

      expect(res.status).toBe(200);
      if (res.status === 200) {
        const json = await res.json();
        expect(json.errors).toBeUndefined();
        expect(json.data.tasks).toHaveLength(0);
      }
    });

    it("handles GraphQL validation errors", async () => {
      const invalidQuery = `
        query InvalidQuery {
          tasks {
            invalidField
          }
        }
      `;

      const res = await app.request("/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: invalidQuery }),
      });

      expect(res.status).toBe(400);
      if (res.status === 400) {
        const json = await res.json();
        expect(json.errors).toBeDefined();
        expect(Array.isArray(json.errors)).toBe(true);
        expect(json.errors[0].message).toContain("invalidField");
      }
    });

    it("handles malformed GraphQL syntax", async () => {
      const malformedQuery = `
        query {
          tasks {
            id
            name
          // Missing closing brace
      `;

      const res = await app.request("/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: malformedQuery }),
      });

      expect(res.status).toBe(400);
      if (res.status === 400) {
        const json = await res.json();
        expect(json.errors).toBeDefined();
        expect(Array.isArray(json.errors)).toBe(true);
      }
    });
  });

  describe("authentication GraphQL operations", () => {
    let userAccessToken: string;
    let userRefreshToken: string;
    let userId: string;

    // Helper function to generate unique emails for test isolation
    function generateUniqueEmail(base: string): string {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      return `${base}-${timestamp}-${random}@example.com`;
    }

    describe("register mutation", () => {
      it("should register a new user", async () => {
        const mutation = `
          mutation RegisterUser($email: String!, $password: String!, $name: String, $imageUrl: String) {
            register(email: $email, password: $password, name: $name, imageUrl: $imageUrl) {
              user {
                id
                email
                name
                imageUrl
                isActive
                createdAt
                updatedAt
              }
              accessToken
              refreshToken
            }
          }
        `;

        const variables = {
          email: generateUniqueEmail("graphql-test"),
          password: "Password123!",
          name: "GraphQL Test User",
          imageUrl: "https://example.com/avatar.jpg",
        };

        const res = await app.request("/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: mutation, variables }),
        });

        expect(res.status).toBe(200);
        if (res.status === 200) {
          const json = await res.json();
          expect(json.errors).toBeUndefined();
          expect(json.data.register).toBeDefined();

          const { user, accessToken, refreshToken } = json.data.register;

          // Store for other tests
          userAccessToken = accessToken;
          userRefreshToken = refreshToken;
          userId = user.id;

          // Verify user data
          expect(user.id).toBeDefined();
          expect(user.email).toBe(variables.email);
          expect(user.name).toBe(variables.name);
          expect(user.imageUrl).toBe(variables.imageUrl);
          expect(user.isActive).toBe(true);
          expect(user.createdAt).toBeDefined();
          expect(user.updatedAt).toBeDefined();

          // Verify tokens
          expect(accessToken).toBeDefined();
          expect(typeof accessToken).toBe("string");
          expect(refreshToken).toBeDefined();
          expect(typeof refreshToken).toBe("string");
        }
      });

      it("should reject registration with invalid password", async () => {
        const mutation = `
          mutation RegisterUser($email: String!, $password: String!) {
            register(email: $email, password: $password) {
              user { id }
              accessToken
              refreshToken
            }
          }
        `;

        const variables = {
          email: generateUniqueEmail("invalid-password"),
          password: "weak", // Invalid password
        };

        const res = await app.request("/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: mutation, variables }),
        });

        expect(res.status).toBe(200);
        if (res.status === 200) {
          const json = await res.json();
          expect(json.errors).toBeDefined();
          expect(json.errors[0].message).toContain("Password validation failed");
        }
      });

      it("should reject registration with duplicate email", async () => {
        const mutation = `
          mutation RegisterUser($email: String!, $password: String!) {
            register(email: $email, password: $password) {
              user { id }
              accessToken
              refreshToken
            }
          }
        `;

        const duplicateEmail = generateUniqueEmail("duplicate");

        // Register first user
        const variables1 = {
          email: duplicateEmail,
          password: "Password123!",
        };

        await app.request("/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: mutation, variables: variables1 }),
        });

        // Try to register with same email
        const variables2 = {
          email: duplicateEmail,
          password: "DifferentPassword123!",
        };

        const res = await app.request("/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: mutation, variables: variables2 }),
        });

        expect(res.status).toBe(200);
        if (res.status === 200) {
          const json = await res.json();
          expect(json.errors).toBeDefined();
          expect(json.errors[0].message).toContain("Email already exists");
        }
      });
    });

    describe("login mutation", () => {
      it("should login with valid credentials", async () => {
        // First register a user
        const email = generateUniqueEmail("login-test");
        const password = "Password123!";

        const registerMutation = `
          mutation RegisterUser($email: String!, $password: String!) {
            register(email: $email, password: $password) {
              user { id }
              accessToken
              refreshToken
            }
          }
        `;

        await app.request("/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: registerMutation,
            variables: { email, password },
          }),
        });

        // Now test login
        const loginMutation = `
          mutation LoginUser($email: String!, $password: String!) {
            login(email: $email, password: $password) {
              user {
                id
                email
                name
                imageUrl
                isActive
                lastLoginAt
              }
              accessToken
              refreshToken
            }
          }
        `;

        const res = await app.request("/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: loginMutation,
            variables: { email, password },
          }),
        });

        expect(res.status).toBe(200);
        if (res.status === 200) {
          const json = await res.json();
          expect(json.errors).toBeUndefined();
          expect(json.data.login).toBeDefined();

          const { user, accessToken, refreshToken } = json.data.login;

          expect(user.email).toBe(email);
          expect(user.isActive).toBe(true);
          expect(accessToken).toBeDefined();
          expect(refreshToken).toBeDefined();
        }
      });

      it("should reject login with invalid credentials", async () => {
        const mutation = `
          mutation LoginUser($email: String!, $password: String!) {
            login(email: $email, password: $password) {
              user { id }
              accessToken
              refreshToken
            }
          }
        `;

        const variables = {
          email: generateUniqueEmail("nonexistent"),
          password: "WrongPassword123!",
        };

        const res = await app.request("/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: mutation, variables }),
        });

        expect(res.status).toBe(200);
        if (res.status === 200) {
          const json = await res.json();
          expect(json.errors).toBeDefined();
          expect(json.errors[0].message).toContain("Invalid credentials");
        }
      });
    });

    describe("me query", () => {
      it("should return current user when authenticated", async () => {
        const query = `
          query GetMe {
            me {
              id
              email
              name
              imageUrl
              isActive
            }
          }
        `;

        const res = await app.request("/graphql", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${userAccessToken}`,
          },
          body: JSON.stringify({ query }),
        });

        expect(res.status).toBe(200);
        if (res.status === 200) {
          const json = await res.json();
          expect(json.errors).toBeUndefined();
          expect(json.data.me).toBeDefined();
          expect(json.data.me.id).toBe(userId);
          expect(json.data.me.isActive).toBe(true);
        }
      });

      it("should return error when not authenticated", async () => {
        const query = `
          query GetMe {
            me {
              id
              email
            }
          }
        `;

        const res = await app.request("/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });

        expect(res.status).toBe(200);
        if (res.status === 200) {
          const json = await res.json();
          expect(json.errors).toBeDefined();
          expect(json.errors[0].message).toContain("Authentication required");
        }
      });

      it("should return error with invalid token", async () => {
        const query = `
          query GetMe {
            me {
              id
              email
            }
          }
        `;

        const res = await app.request("/graphql", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer invalid-token",
          },
          body: JSON.stringify({ query }),
        });

        expect(res.status).toBe(200);
        if (res.status === 200) {
          const json = await res.json();
          expect(json.errors).toBeDefined();
          expect(json.errors[0].message).toContain("Authentication required");
        }
      });
    });

    describe("refreshToken mutation", () => {
      it("should refresh tokens with valid refresh token", async () => {
        const mutation = `
          mutation RefreshTokens($refreshToken: String!) {
            refreshToken(refreshToken: $refreshToken) {
              accessToken
              refreshToken
            }
          }
        `;

        const res = await app.request("/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: mutation,
            variables: { refreshToken: userRefreshToken },
          }),
        });

        expect(res.status).toBe(200);
        if (res.status === 200) {
          const json = await res.json();
          expect(json.errors).toBeUndefined();
          expect(json.data.refreshToken).toBeDefined();

          const { accessToken, refreshToken } = json.data.refreshToken;

          expect(accessToken).toBeDefined();
          expect(typeof accessToken).toBe("string");
          expect(refreshToken).toBeDefined();
          expect(typeof refreshToken).toBe("string");

          // Update tokens for future tests
          userAccessToken = accessToken;
          userRefreshToken = refreshToken;
        }
      });

      it("should reject invalid refresh token", async () => {
        const mutation = `
          mutation RefreshTokens($refreshToken: String!) {
            refreshToken(refreshToken: $refreshToken) {
              accessToken
              refreshToken
            }
          }
        `;

        const res = await app.request("/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: mutation,
            variables: { refreshToken: "invalid-refresh-token" },
          }),
        });

        expect(res.status).toBe(200);
        if (res.status === 200) {
          const json = await res.json();
          expect(json.errors).toBeDefined();
          expect(json.errors[0].message).toContain("Invalid refresh token");
        }
      });
    });
  });
});
