// src/lib/pubsub.ts
import { PubSub } from "graphql-subscriptions";

import type { Post } from "@/routes/posts/posts.handlers";
import type { Product } from "@/routes/products/products.handlers";
import type { Task } from "@/routes/tasks/tasks.handlers";

/**
 * PubSub instance for GraphQL subscriptions and real-time events
 * This is a singleton shared across the application
 */
export const pubsub = new PubSub();

/**
 * Event types for subscriptions
 */
export const SUBSCRIPTION_EVENTS = {
  // Task events
  TASK_CREATED: "TASK_CREATED",
  TASK_UPDATED: "TASK_UPDATED",
  TASK_DELETED: "TASK_DELETED",

  // Product events
  PRODUCT_CREATED: "PRODUCT_CREATED",
  PRODUCT_UPDATED: "PRODUCT_UPDATED",
  PRODUCT_DELETED: "PRODUCT_DELETED",

  // Post events
  POST_CREATED: "POST_CREATED",
  POST_UPDATED: "POST_UPDATED",
  POST_DELETED: "POST_DELETED",
  POST_PUBLISHED: "POST_PUBLISHED",
} as const;

/**
 * Type definitions for subscription payloads
 * Using exported types from handlers for consistency
 */
export type TaskPayload = Task;
export type ProductPayload = Product;
export type PostPayload = Post;
