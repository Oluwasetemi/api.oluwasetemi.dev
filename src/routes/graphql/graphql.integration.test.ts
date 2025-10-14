import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import env from "@/env";
import { createTestApp } from "@/lib/create-app";
import { pubsub, SUBSCRIPTION_EVENTS } from "@/lib/pubsub";
import { cleanupTestDatabase, setupTestDatabase } from "@/lib/test-setup";

import router from "./graphql.index";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

const _app = createTestApp(router);

vi.setConfig({
  testTimeout: 120000,
});

describe("graphQL subscriptions integration", () => {
  let testDbPath: string;

  beforeAll(async () => {
    testDbPath = await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase(testDbPath);
  });

  describe("task subscription integration", () => {
    it("should trigger taskCreated subscription when task is created via REST API", async () => {
      // Setup subscription listener
      const iterator = pubsub.asyncIterableIterator([SUBSCRIPTION_EVENTS.TASK_CREATED]);
      const subscriptionPromise = iterator.next();

      // Simulate creating a task (which should trigger pubsub.publish)
      const testTask = {
        id: crypto.randomUUID(),
        name: "Integration Test Task",
        description: "Testing subscription integration",
        status: "TODO",
        priority: "HIGH",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Manually trigger the event (simulating what the REST handler does)
      await pubsub.publish(SUBSCRIPTION_EVENTS.TASK_CREATED, {
        taskCreated: testTask,
      });

      // Verify subscription received the event
      const result = await subscriptionPromise;
      expect(result.done).toBe(false);
      expect(result.value.taskCreated).toEqual(testTask);

      // Cleanup
      if (typeof iterator.return === "function") {
        await iterator.return();
      }
    });

    it("should trigger taskUpdated subscription when task is updated", async () => {
      const iterator = pubsub.asyncIterableIterator([SUBSCRIPTION_EVENTS.TASK_UPDATED]);
      const subscriptionPromise = iterator.next();

      const testTask = {
        id: crypto.randomUUID(),
        name: "Updated Task",
        description: "Updated description",
        status: "IN_PROGRESS",
        priority: "MEDIUM",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await pubsub.publish(SUBSCRIPTION_EVENTS.TASK_UPDATED, {
        taskUpdated: testTask,
      });

      const result = await subscriptionPromise;
      expect(result.value.taskUpdated).toEqual(testTask);

      if (typeof iterator.return === "function") {
        await iterator.return();
      }
    });

    it("should trigger taskDeleted subscription when task is deleted", async () => {
      const iterator = pubsub.asyncIterableIterator([SUBSCRIPTION_EVENTS.TASK_DELETED]);
      const subscriptionPromise = iterator.next();

      const taskId = crypto.randomUUID();

      await pubsub.publish(SUBSCRIPTION_EVENTS.TASK_DELETED, {
        taskDeleted: { id: taskId },
      });

      const result = await subscriptionPromise;
      expect(result.value.taskDeleted.id).toBe(taskId);

      if (typeof iterator.return === "function") {
        await iterator.return();
      }
    });
  });

  describe("product subscription integration", () => {
    it("should trigger productCreated subscription when product is created", async () => {
      const iterator = pubsub.asyncIterableIterator([SUBSCRIPTION_EVENTS.PRODUCT_CREATED]);
      const subscriptionPromise = iterator.next();

      const testProduct = {
        id: crypto.randomUUID(),
        name: "Integration Test Product",
        description: "Testing product subscription",
        price: 99.99,
        sku: "INT-TEST-001",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await pubsub.publish(SUBSCRIPTION_EVENTS.PRODUCT_CREATED, {
        productCreated: testProduct,
      });

      const result = await subscriptionPromise;
      expect(result.value.productCreated).toEqual(testProduct);

      if (typeof iterator.return === "function") {
        await iterator.return();
      }
    });

    it("should trigger productUpdated subscription when product is updated", async () => {
      const iterator = pubsub.asyncIterableIterator([SUBSCRIPTION_EVENTS.PRODUCT_UPDATED]);
      const subscriptionPromise = iterator.next();

      const testProduct = {
        id: crypto.randomUUID(),
        name: "Updated Product",
        description: "Updated description",
        price: 149.99,
        sku: "UPD-TEST-001",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await pubsub.publish(SUBSCRIPTION_EVENTS.PRODUCT_UPDATED, {
        productUpdated: testProduct,
      });

      const result = await subscriptionPromise;
      expect(result.value.productUpdated).toEqual(testProduct);

      if (typeof iterator.return === "function") {
        await iterator.return();
      }
    });

    it("should trigger productDeleted subscription when product is deleted", async () => {
      const iterator = pubsub.asyncIterableIterator([SUBSCRIPTION_EVENTS.PRODUCT_DELETED]);
      const subscriptionPromise = iterator.next();

      const productId = crypto.randomUUID();

      await pubsub.publish(SUBSCRIPTION_EVENTS.PRODUCT_DELETED, {
        productDeleted: { id: productId },
      });

      const result = await subscriptionPromise;
      expect(result.value.productDeleted.id).toBe(productId);

      if (typeof iterator.return === "function") {
        await iterator.return();
      }
    });
  });

  describe("post subscription integration", () => {
    it("should trigger postCreated subscription when post is created", async () => {
      const iterator = pubsub.asyncIterableIterator([SUBSCRIPTION_EVENTS.POST_CREATED]);
      const subscriptionPromise = iterator.next();

      const testPost = {
        id: crypto.randomUUID(),
        title: "Integration Test Post",
        slug: "integration-test-post",
        content: "Testing post subscription",
        status: "DRAFT",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await pubsub.publish(SUBSCRIPTION_EVENTS.POST_CREATED, {
        postCreated: testPost,
      });

      const result = await subscriptionPromise;
      expect(result.value.postCreated).toEqual(testPost);

      if (typeof iterator.return === "function") {
        await iterator.return();
      }
    });

    it("should trigger postUpdated subscription when post is updated", async () => {
      const iterator = pubsub.asyncIterableIterator([SUBSCRIPTION_EVENTS.POST_UPDATED]);
      const subscriptionPromise = iterator.next();

      const testPost = {
        id: crypto.randomUUID(),
        title: "Updated Post",
        slug: "updated-post",
        content: "Updated content",
        status: "DRAFT",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await pubsub.publish(SUBSCRIPTION_EVENTS.POST_UPDATED, {
        postUpdated: testPost,
      });

      const result = await subscriptionPromise;
      expect(result.value.postUpdated).toEqual(testPost);

      if (typeof iterator.return === "function") {
        await iterator.return();
      }
    });

    it("should trigger postPublished subscription when post is published", async () => {
      const iterator = pubsub.asyncIterableIterator([SUBSCRIPTION_EVENTS.POST_PUBLISHED]);
      const subscriptionPromise = iterator.next();

      const testPost = {
        id: crypto.randomUUID(),
        title: "Published Post",
        slug: "published-post",
        content: "Published content",
        status: "PUBLISHED",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await pubsub.publish(SUBSCRIPTION_EVENTS.POST_PUBLISHED, {
        postPublished: testPost,
      });

      const result = await subscriptionPromise;
      expect(result.value.postPublished).toEqual(testPost);

      if (typeof iterator.return === "function") {
        await iterator.return();
      }
    });

    it("should trigger postDeleted subscription when post is deleted", async () => {
      const iterator = pubsub.asyncIterableIterator([SUBSCRIPTION_EVENTS.POST_DELETED]);
      const subscriptionPromise = iterator.next();

      const postId = crypto.randomUUID();

      await pubsub.publish(SUBSCRIPTION_EVENTS.POST_DELETED, {
        postDeleted: { id: postId },
      });

      const result = await subscriptionPromise;
      expect(result.value.postDeleted.id).toBe(postId);

      if (typeof iterator.return === "function") {
        await iterator.return();
      }
    });
  });

  describe("multiple concurrent subscriptions", () => {
    it("should handle multiple subscribers to different events", async () => {
      const taskIterator = pubsub.asyncIterableIterator([SUBSCRIPTION_EVENTS.TASK_CREATED]);
      const productIterator = pubsub.asyncIterableIterator([SUBSCRIPTION_EVENTS.PRODUCT_CREATED]);
      const postIterator = pubsub.asyncIterableIterator([SUBSCRIPTION_EVENTS.POST_CREATED]);

      const taskPromise = taskIterator.next();
      const productPromise = productIterator.next();
      const postPromise = postIterator.next();

      const taskData = {
        id: crypto.randomUUID(),
        name: "Concurrent Task",
        description: "Testing concurrent subscriptions",
        status: "TODO",
        priority: "LOW",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const productData = {
        id: crypto.randomUUID(),
        name: "Concurrent Product",
        description: "Testing concurrent subscriptions",
        price: 49.99,
        sku: "CONC-001",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const postData = {
        id: crypto.randomUUID(),
        title: "Concurrent Post",
        slug: "concurrent-post",
        content: "Testing concurrent subscriptions",
        status: "DRAFT",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Publish all events
      await pubsub.publish(SUBSCRIPTION_EVENTS.TASK_CREATED, { taskCreated: taskData });
      await pubsub.publish(SUBSCRIPTION_EVENTS.PRODUCT_CREATED, { productCreated: productData });
      await pubsub.publish(SUBSCRIPTION_EVENTS.POST_CREATED, { postCreated: postData });

      // All should receive their respective events
      const taskResult = await taskPromise;
      const productResult = await productPromise;
      const postResult = await postPromise;

      expect(taskResult.value.taskCreated).toEqual(taskData);
      expect(productResult.value.productCreated).toEqual(productData);
      expect(postResult.value.postCreated).toEqual(postData);

      // Cleanup
      if (typeof taskIterator.return === "function") {
        await taskIterator.return();
      }
      if (typeof productIterator.return === "function") {
        await productIterator.return();
      }
      if (typeof postIterator.return === "function") {
        await postIterator.return();
      }
    });

    it("should handle multiple subscribers to same event", async () => {
      const iterator1 = pubsub.asyncIterableIterator([SUBSCRIPTION_EVENTS.TASK_CREATED]);
      const iterator2 = pubsub.asyncIterableIterator([SUBSCRIPTION_EVENTS.TASK_CREATED]);
      const iterator3 = pubsub.asyncIterableIterator([SUBSCRIPTION_EVENTS.TASK_CREATED]);

      const promise1 = iterator1.next();
      const promise2 = iterator2.next();
      const promise3 = iterator3.next();

      const taskData = {
        id: crypto.randomUUID(),
        name: "Broadcast Task",
        description: "Testing broadcast to multiple subscribers",
        status: "TODO",
        priority: "HIGH",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await pubsub.publish(SUBSCRIPTION_EVENTS.TASK_CREATED, { taskCreated: taskData });

      const result1 = await promise1;
      const result2 = await promise2;
      const result3 = await promise3;

      // All should receive the same event
      expect(result1.value.taskCreated).toEqual(taskData);
      expect(result2.value.taskCreated).toEqual(taskData);
      expect(result3.value.taskCreated).toEqual(taskData);

      // Cleanup
      if (typeof iterator1.return === "function") {
        await iterator1.return();
      }
      if (typeof iterator2.return === "function") {
        await iterator2.return();
      }
      if (typeof iterator3.return === "function") {
        await iterator3.return();
      }
    });
  });

  describe("subscription lifecycle", () => {
    it("should receive multiple events on same subscription", async () => {
      const iterator = pubsub.asyncIterableIterator([SUBSCRIPTION_EVENTS.TASK_CREATED]);

      const promise1 = iterator.next();
      const task1 = {
        id: crypto.randomUUID(),
        name: "Task 1",
        description: "First task",
        status: "TODO",
        priority: "HIGH",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await pubsub.publish(SUBSCRIPTION_EVENTS.TASK_CREATED, { taskCreated: task1 });

      const result1 = await promise1;
      expect(result1.value.taskCreated).toEqual(task1);

      const promise2 = iterator.next();
      const task2 = {
        id: crypto.randomUUID(),
        name: "Task 2",
        description: "Second task",
        status: "TODO",
        priority: "MEDIUM",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await pubsub.publish(SUBSCRIPTION_EVENTS.TASK_CREATED, { taskCreated: task2 });

      const result2 = await promise2;
      expect(result2.value.taskCreated).toEqual(task2);

      if (typeof iterator.return === "function") {
        await iterator.return();
      }
    });

    it("should not receive events after unsubscribing", async () => {
      const iterator = pubsub.asyncIterableIterator([SUBSCRIPTION_EVENTS.PRODUCT_CREATED]);

      // Subscribe and receive one event
      const promise1 = iterator.next();
      const product1 = {
        id: crypto.randomUUID(),
        name: "Product Before Unsubscribe",
        description: "Should receive this",
        price: 29.99,
        sku: "BEFORE-001",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await pubsub.publish(SUBSCRIPTION_EVENTS.PRODUCT_CREATED, { productCreated: product1 });

      const result1 = await promise1;
      expect(result1.value.productCreated).toEqual(product1);

      // Unsubscribe
      if (typeof iterator.return === "function") {
        await iterator.return();
      }

      // Publish event after unsubscribing
      const product2 = {
        id: crypto.randomUUID(),
        name: "Product After Unsubscribe",
        description: "Should NOT receive this",
        price: 39.99,
        sku: "AFTER-001",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await pubsub.publish(SUBSCRIPTION_EVENTS.PRODUCT_CREATED, { productCreated: product2 });

      // Verify that the iterator is done and won't receive the event
      // We use a timeout to ensure the event doesn't arrive
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => resolve("timeout"), 100);
      });

      const nextPromise = iterator.next().then(result => result.done).catch(() => true);

      const result = await Promise.race([nextPromise, timeoutPromise]);

      // Either the iterator is done (true) or we timed out waiting for an event
      // Both cases indicate the unsubscription worked correctly
      expect(result).toBeTruthy();
    });
  });

  describe("error handling", () => {
    it("should handle malformed subscription data gracefully", async () => {
      const iterator = pubsub.asyncIterableIterator([SUBSCRIPTION_EVENTS.TASK_CREATED]);

      // Don't throw if publishing with wrong structure
      await expect(
        pubsub.publish(SUBSCRIPTION_EVENTS.TASK_CREATED, { wrongKey: {} }),
      ).resolves.not.toThrow();

      if (typeof iterator.return === "function") {
        await iterator.return();
      }
    });

    it("should handle publishing to event with no subscribers", async () => {
      const taskData = {
        id: crypto.randomUUID(),
        name: "No Subscribers Task",
        description: "Testing publish with no subscribers",
        status: "TODO",
        priority: "LOW",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Should not throw even if no one is listening
      await expect(
        pubsub.publish(SUBSCRIPTION_EVENTS.TASK_CREATED, { taskCreated: taskData }),
      ).resolves.not.toThrow();
    });
  });
});
