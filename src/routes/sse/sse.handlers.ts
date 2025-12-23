import { streamSSE } from "hono/streaming";

import type { AppRouteHandler } from "@/lib/types";

import { AuthService } from "@/lib/auth";
import { pubsub, SUBSCRIPTION_EVENTS } from "@/lib/pubsub";

import type { CommentsStreamRoute, PostsStreamRoute, ProductsStreamRoute, TasksStreamRoute } from "./sse.routes";

const HEARTBEAT_INTERVAL = 30000; // 30 seconds

/**
 * SSE handler for task events
 */
export const tasksStream: AppRouteHandler<TasksStreamRoute> = async (c) => {
  const { taskId } = c.req.valid("query");

  // Extract optional authentication
  let userId: string | undefined;
  try {
    const authHeader = c.req.header("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const payload = await AuthService.verifyAccessToken(token);
      userId = payload.userId;
    }
  }
  catch {
    // Allow anonymous connections
  }

  return streamSSE(c, async (stream) => {
    const connectionId = crypto.randomUUID();

    // Send initial connection event
    await stream.writeSSE({
      event: "connected",
      data: JSON.stringify({
        connectionId,
        channel: "tasks",
        taskId: taskId || null,
        userId: userId || null,
        timestamp: new Date().toISOString(),
      }),
    });

    // Set up heartbeat
    const heartbeatInterval = setInterval(async () => {
      try {
        await stream.writeSSE({
          event: "heartbeat",
          data: JSON.stringify({ timestamp: new Date().toISOString() }),
        });
      }
      catch {
        clearInterval(heartbeatInterval);
      }
    }, HEARTBEAT_INTERVAL);

    // Subscribe to task events
    const taskCreatedSubscription = pubsub.asyncIterableIterator(SUBSCRIPTION_EVENTS.TASK_CREATED) as AsyncIterableIterator<any>;
    const taskUpdatedSubscription = pubsub.asyncIterableIterator(SUBSCRIPTION_EVENTS.TASK_UPDATED) as AsyncIterableIterator<any>;
    const taskDeletedSubscription = pubsub.asyncIterableIterator(SUBSCRIPTION_EVENTS.TASK_DELETED) as AsyncIterableIterator<any>;

    // Handle task created events
    const handleCreated = (async () => {
      for await (const payload of taskCreatedSubscription) {
        try {
          // Filter by taskId if specified
          if (taskId && payload.task.id !== taskId)
            continue;

          // Filter by userId if authenticated
          if (userId && payload.task.owner !== userId)
            continue;

          await stream.writeSSE({
            event: "task.created",
            data: JSON.stringify({
              task: payload.task,
              timestamp: new Date().toISOString(),
            }),
          });
        }
        catch {
          break;
        }
      }
    })();

    // Handle task updated events
    const handleUpdated = (async () => {
      for await (const payload of taskUpdatedSubscription) {
        try {
          if (taskId && payload.task.id !== taskId)
            continue;
          if (userId && payload.task.owner !== userId)
            continue;

          await stream.writeSSE({
            event: "task.updated",
            data: JSON.stringify({
              task: payload.task,
              timestamp: new Date().toISOString(),
            }),
          });
        }
        catch {
          break;
        }
      }
    })();

    // Handle task deleted events
    const handleDeleted = (async () => {
      for await (const payload of taskDeletedSubscription) {
        try {
          if (taskId && payload.id !== taskId)
            continue;
          if (userId && payload.owner !== userId)
            continue;

          await stream.writeSSE({
            event: "task.deleted",
            data: JSON.stringify({
              id: payload.id,
              timestamp: new Date().toISOString(),
            }),
          });
        }
        catch {
          break;
        }
      }
    })();

    // Wait for stream to close
    await stream.onAbort(() => {
      clearInterval(heartbeatInterval);
      // Cleanup subscriptions would go here if pubsub supported it
    });

    // Keep handlers alive
    await Promise.race([handleCreated, handleUpdated, handleDeleted]);
  });
};

/**
 * SSE handler for product events
 */
export const productsStream: AppRouteHandler<ProductsStreamRoute> = async (c) => {
  const { productId } = c.req.valid("query");

  let userId: string | undefined;
  try {
    const authHeader = c.req.header("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const payload = await AuthService.verifyAccessToken(token);
      userId = payload.userId;
    }
  }
  catch {
    // Allow anonymous connections
  }

  return streamSSE(c, async (stream) => {
    const connectionId = crypto.randomUUID();

    await stream.writeSSE({
      event: "connected",
      data: JSON.stringify({
        connectionId,
        channel: "products",
        productId: productId || null,
        userId: userId || null,
        timestamp: new Date().toISOString(),
      }),
    });

    const heartbeatInterval = setInterval(async () => {
      try {
        await stream.writeSSE({
          event: "heartbeat",
          data: JSON.stringify({ timestamp: new Date().toISOString() }),
        });
      }
      catch {
        clearInterval(heartbeatInterval);
      }
    }, HEARTBEAT_INTERVAL);

    const productCreatedSubscription = pubsub.asyncIterableIterator(SUBSCRIPTION_EVENTS.PRODUCT_CREATED) as AsyncIterableIterator<any>;
    const productUpdatedSubscription = pubsub.asyncIterableIterator(SUBSCRIPTION_EVENTS.PRODUCT_UPDATED) as AsyncIterableIterator<any>;
    const productDeletedSubscription = pubsub.asyncIterableIterator(SUBSCRIPTION_EVENTS.PRODUCT_DELETED) as AsyncIterableIterator<any>;

    const handleCreated = (async () => {
      for await (const payload of productCreatedSubscription) {
        try {
          if (productId && payload.product.id !== productId)
            continue;
          if (userId && payload.product.owner !== userId)
            continue;

          await stream.writeSSE({
            event: "product.created",
            data: JSON.stringify({
              product: payload.product,
              timestamp: new Date().toISOString(),
            }),
          });
        }
        catch {
          break;
        }
      }
    })();

    const handleUpdated = (async () => {
      for await (const payload of productUpdatedSubscription) {
        try {
          if (productId && payload.product.id !== productId)
            continue;
          if (userId && payload.product.owner !== userId)
            continue;

          await stream.writeSSE({
            event: "product.updated",
            data: JSON.stringify({
              product: payload.product,
              timestamp: new Date().toISOString(),
            }),
          });
        }
        catch {
          break;
        }
      }
    })();

    const handleDeleted = (async () => {
      for await (const payload of productDeletedSubscription) {
        try {
          if (productId && payload.id !== productId)
            continue;
          if (userId && payload.owner !== userId)
            continue;

          await stream.writeSSE({
            event: "product.deleted",
            data: JSON.stringify({
              id: payload.id,
              timestamp: new Date().toISOString(),
            }),
          });
        }
        catch {
          break;
        }
      }
    })();

    await stream.onAbort(() => {
      clearInterval(heartbeatInterval);
    });

    await Promise.race([handleCreated, handleUpdated, handleDeleted]);
  });
};

/**
 * SSE handler for post events
 */
export const postsStream: AppRouteHandler<PostsStreamRoute> = async (c) => {
  const { postId } = c.req.valid("query");

  let userId: string | undefined;
  try {
    const authHeader = c.req.header("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const payload = await AuthService.verifyAccessToken(token);
      userId = payload.userId;
    }
  }
  catch {
    // Allow anonymous connections
  }

  return streamSSE(c, async (stream) => {
    const connectionId = crypto.randomUUID();

    await stream.writeSSE({
      event: "connected",
      data: JSON.stringify({
        connectionId,
        channel: "posts",
        postId: postId || null,
        userId: userId || null,
        timestamp: new Date().toISOString(),
      }),
    });

    const heartbeatInterval = setInterval(async () => {
      try {
        await stream.writeSSE({
          event: "heartbeat",
          data: JSON.stringify({ timestamp: new Date().toISOString() }),
        });
      }
      catch {
        clearInterval(heartbeatInterval);
      }
    }, HEARTBEAT_INTERVAL);

    const postCreatedSubscription = pubsub.asyncIterableIterator(SUBSCRIPTION_EVENTS.POST_CREATED) as AsyncIterableIterator<any>;
    const postUpdatedSubscription = pubsub.asyncIterableIterator(SUBSCRIPTION_EVENTS.POST_UPDATED) as AsyncIterableIterator<any>;
    const postDeletedSubscription = pubsub.asyncIterableIterator(SUBSCRIPTION_EVENTS.POST_DELETED) as AsyncIterableIterator<any>;
    const postPublishedSubscription = pubsub.asyncIterableIterator(SUBSCRIPTION_EVENTS.POST_PUBLISHED) as AsyncIterableIterator<any>;

    const handleCreated = (async () => {
      for await (const payload of postCreatedSubscription) {
        try {
          if (postId && payload.post.id !== postId)
            continue;
          if (userId && payload.post.author !== userId)
            continue;

          await stream.writeSSE({
            event: "post.created",
            data: JSON.stringify({
              post: payload.post,
              timestamp: new Date().toISOString(),
            }),
          });
        }
        catch {
          break;
        }
      }
    })();

    const handleUpdated = (async () => {
      for await (const payload of postUpdatedSubscription) {
        try {
          if (postId && payload.post.id !== postId)
            continue;
          if (userId && payload.post.author !== userId)
            continue;

          await stream.writeSSE({
            event: "post.updated",
            data: JSON.stringify({
              post: payload.post,
              timestamp: new Date().toISOString(),
            }),
          });
        }
        catch {
          break;
        }
      }
    })();

    const handleDeleted = (async () => {
      for await (const payload of postDeletedSubscription) {
        try {
          if (postId && payload.id !== postId)
            continue;
          if (userId && payload.author !== userId)
            continue;

          await stream.writeSSE({
            event: "post.deleted",
            data: JSON.stringify({
              id: payload.id,
              timestamp: new Date().toISOString(),
            }),
          });
        }
        catch {
          break;
        }
      }
    })();

    const handlePublished = (async () => {
      for await (const payload of postPublishedSubscription) {
        try {
          if (postId && payload.post.id !== postId)
            continue;
          if (userId && payload.post.author !== userId)
            continue;

          await stream.writeSSE({
            event: "post.published",
            data: JSON.stringify({
              post: payload.post,
              timestamp: new Date().toISOString(),
            }),
          });
        }
        catch {
          break;
        }
      }
    })();

    await stream.onAbort(() => {
      clearInterval(heartbeatInterval);
    });

    await Promise.race([handleCreated, handleUpdated, handleDeleted, handlePublished]);
  });
};

/**
 * SSE handler for comment events
 */
export const commentsStream: AppRouteHandler<CommentsStreamRoute> = async (c) => {
  const { postId, commentId } = c.req.valid("query");

  let userId: string | undefined;
  try {
    const authHeader = c.req.header("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const payload = await AuthService.verifyAccessToken(token);
      userId = payload.userId;
    }
  }
  catch {
    // Allow anonymous connections
  }

  return streamSSE(c, async (stream) => {
    const connectionId = crypto.randomUUID();

    await stream.writeSSE({
      event: "connected",
      data: JSON.stringify({
        connectionId,
        channel: "comments",
        postId: postId || null,
        commentId: commentId || null,
        userId: userId || null,
        timestamp: new Date().toISOString(),
      }),
    });

    const heartbeatInterval = setInterval(async () => {
      try {
        await stream.writeSSE({
          event: "heartbeat",
          data: JSON.stringify({ timestamp: new Date().toISOString() }),
        });
      }
      catch {
        clearInterval(heartbeatInterval);
      }
    }, HEARTBEAT_INTERVAL);

    const commentCreatedSubscription = pubsub.asyncIterableIterator(SUBSCRIPTION_EVENTS.COMMENT_CREATED) as AsyncIterableIterator<any>;
    const commentUpdatedSubscription = pubsub.asyncIterableIterator(SUBSCRIPTION_EVENTS.COMMENT_UPDATED) as AsyncIterableIterator<any>;
    const commentDeletedSubscription = pubsub.asyncIterableIterator(SUBSCRIPTION_EVENTS.COMMENT_DELETED) as AsyncIterableIterator<any>;

    const handleCreated = (async () => {
      for await (const payload of commentCreatedSubscription) {
        try {
          // Filter by commentId if specified
          if (commentId && payload.commentCreated.id !== commentId)
            continue;
          // Filter by postId if specified
          if (postId && payload.commentCreated.postId !== postId)
            continue;
          // Filter by userId if authenticated (author check)
          if (userId && payload.commentCreated.authorId !== userId)
            continue;

          await stream.writeSSE({
            event: "comment.created",
            data: JSON.stringify({
              comment: payload.commentCreated,
              timestamp: new Date().toISOString(),
            }),
          });
        }
        catch {
          break;
        }
      }
    })();

    const handleUpdated = (async () => {
      for await (const payload of commentUpdatedSubscription) {
        try {
          if (commentId && payload.commentUpdated.id !== commentId)
            continue;
          if (postId && payload.commentUpdated.postId !== postId)
            continue;
          if (userId && payload.commentUpdated.authorId !== userId)
            continue;

          await stream.writeSSE({
            event: "comment.updated",
            data: JSON.stringify({
              comment: payload.commentUpdated,
              timestamp: new Date().toISOString(),
            }),
          });
        }
        catch {
          break;
        }
      }
    })();

    const handleDeleted = (async () => {
      for await (const payload of commentDeletedSubscription) {
        try {
          if (commentId && payload.commentDeleted.id !== commentId)
            continue;
          if (postId && payload.commentDeleted.postId !== postId)
            continue;
          // No userId filter for deleted events as we only have id/postId

          await stream.writeSSE({
            event: "comment.deleted",
            data: JSON.stringify({
              id: payload.commentDeleted.id,
              postId: payload.commentDeleted.postId,
              timestamp: new Date().toISOString(),
            }),
          });
        }
        catch {
          break;
        }
      }
    })();

    await stream.onAbort(() => {
      clearInterval(heartbeatInterval);
    });

    await Promise.race([handleCreated, handleUpdated, handleDeleted]);
  });
};
