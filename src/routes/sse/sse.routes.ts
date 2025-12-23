import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";

export const tasksStream = createRoute({
  path: "/sse/tasks",
  method: "get",
  tags: ["SSE"],
  summary: "Stream task events via Server-Sent Events",
  description: "Real-time stream of task creation, updates, and deletions. Supports optional authentication to filter events by user.",
  request: {
    query: z.object({
      taskId: z.string().uuid().optional().openapi({
        description: "Optional task ID to subscribe to specific task updates",
        example: "550e8400-e29b-41d4-a716-446655440000",
      }),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "SSE stream of task events",
      content: {
        "text/event-stream": {
          schema: {
            type: "string",
            description: "Server-Sent Events stream",
          },
        },
      },
    },
  },
});

export const productsStream = createRoute({
  path: "/sse/products",
  method: "get",
  tags: ["SSE"],
  summary: "Stream product events via Server-Sent Events",
  description: "Real-time stream of product creation, updates, and deletions. Supports optional authentication to filter events by user.",
  request: {
    query: z.object({
      productId: z.string().uuid().optional().openapi({
        description: "Optional product ID to subscribe to specific product updates",
        example: "550e8400-e29b-41d4-a716-446655440000",
      }),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "SSE stream of product events",
      content: {
        "text/event-stream": {
          schema: {
            type: "string",
            description: "Server-Sent Events stream",
          },
        },
      },
    },
  },
});

export const postsStream = createRoute({
  path: "/sse/posts",
  method: "get",
  tags: ["SSE"],
  summary: "Stream post events via Server-Sent Events",
  description: "Real-time stream of post creation, updates, deletions, and publishing. Supports optional authentication to filter events by user.",
  request: {
    query: z.object({
      postId: z.string().uuid().optional().openapi({
        description: "Optional post ID to subscribe to specific post updates",
        example: "550e8400-e29b-41d4-a716-446655440000",
      }),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "SSE stream of post events",
      content: {
        "text/event-stream": {
          schema: {
            type: "string",
            description: "Server-Sent Events stream",
          },
        },
      },
    },
  },
});

export const commentsStream = createRoute({
  path: "/sse/comments",
  method: "get",
  tags: ["SSE"],
  summary: "Stream comment events via Server-Sent Events",
  description: "Real-time stream of comment creation, updates, and deletions. Supports optional filtering by post ID, comment ID, and user authentication.",
  request: {
    query: z.object({
      postId: z.string().uuid().optional().openapi({
        description: "Optional post ID to subscribe to comments on a specific post",
        example: "550e8400-e29b-41d4-a716-446655440000",
      }),
      commentId: z.string().uuid().optional().openapi({
        description: "Optional comment ID to subscribe to specific comment updates",
        example: "550e8400-e29b-41d4-a716-446655440000",
      }),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "SSE stream of comment events",
      content: {
        "text/event-stream": {
          schema: {
            type: "string",
            description: "Server-Sent Events stream",
          },
        },
      },
    },
  },
});

export type TasksStreamRoute = typeof tasksStream;
export type ProductsStreamRoute = typeof productsStream;
export type PostsStreamRoute = typeof postsStream;
export type CommentsStreamRoute = typeof commentsStream;
