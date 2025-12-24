import type { z } from "zod/v4";

import { asc, desc, eq, sql } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import type { selectCommentsSchema } from "@/db/schema";
import type { AppRouteHandler } from "@/lib/types";

import db from "@/db";
import { comments } from "@/db/schema";
import { notFoundSchema } from "@/lib/constants";
import { pubsub, SUBSCRIPTION_EVENTS } from "@/lib/pubsub";
import { emitWebhookEvent } from "@/lib/webhook-service";
import { wsManager } from "@/routes/websockets/websocket.manager";

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from "./comments.routes";

export type Comment = z.infer<typeof selectCommentsSchema>;

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const { postId } = c.req.valid("param");
  const { all, page, limit, sort = "ASC" } = c.req.valid("query");

  // Verify post exists
  const post = await db.query.posts.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, postId);
    },
  });

  if (!post) {
    return c.json(
      notFoundSchema.parse({ message: "Post not found" }),
      HttpStatusCodes.NOT_FOUND,
    );
  }

  const whereConditions = [eq(comments.postId, postId)];
  const orderBy = sort === "ASC" ? [asc(comments.createdAt)] : [desc(comments.createdAt)];

  if (all) {
    const commentsList = await db.query.comments.findMany({
      where: sql`${sql.join(whereConditions, sql` AND `)}`,
      limit: 1000, // Safety limit
      orderBy,
    });
    return c.json(commentsList as Comment[], HttpStatusCodes.OK);
  }
  else {
    const offset = (page - 1) * limit;

    const [commentsList, totalResult] = await Promise.all([
      db.query.comments.findMany({
        where: sql`${sql.join(whereConditions, sql` AND `)}`,
        limit,
        offset,
        orderBy,
      }),
      db.select({ count: sql<number>`count(*)` })
        .from(comments)
        .where(sql`${sql.join(whereConditions, sql` AND `)}`)
        .get(),
    ]);

    const totalCount = totalResult?.count ?? 0;
    const totalPages = Math.ceil(totalCount / limit);

    return c.json({
      data: commentsList as Comment[],
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    }, HttpStatusCodes.OK);
  }
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const { postId } = c.req.valid("param");
  const commentData = c.req.valid("json");

  // Verify post exists
  const post = await db.query.posts.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, postId);
    },
  });

  if (!post) {
    return c.json(
      notFoundSchema.parse({ message: "Post not found" }),
      HttpStatusCodes.NOT_FOUND,
    );
  }

  // Get authenticated user if available
  const user = c.get("user");

  // Build comment data - prefer user info if authenticated
  const commentToInsert = {
    postId,
    content: commentData.content,
    authorName: user?.name || commentData.authorName,
    authorEmail: user?.email || commentData.authorEmail,
    authorId: user?.id || null,
  };

  const inserted = await db.insert(comments).values(commentToInsert).returning().get();

  // Broadcast comment creation to WebSocket clients
  wsManager.broadcast("comments", {
    type: "comment.created",
    data: inserted,
    timestamp: new Date().toISOString(),
  });

  // Also broadcast to specific post channel
  wsManager.broadcast(`post:${postId}:comments`, {
    type: "comment.created",
    data: inserted,
    timestamp: new Date().toISOString(),
  });

  // Publish to GraphQL subscriptions
  pubsub.publish(SUBSCRIPTION_EVENTS.COMMENT_CREATED, { commentCreated: inserted });

  // Emit webhook event
  emitWebhookEvent("comment.created", inserted).catch(console.error);

  return c.json(inserted, HttpStatusCodes.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const comment = await db.query.comments.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, id);
    },
  });

  if (!comment) {
    return c.json(
      notFoundSchema.parse({ message: HttpStatusPhrases.NOT_FOUND }),
      HttpStatusCodes.NOT_FOUND,
    );
  }

  return c.json(comment, HttpStatusCodes.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const updates = c.req.valid("json");

  // Get existing comment
  const existingComment = await db.query.comments.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, id);
    },
  });

  if (!existingComment) {
    return c.json(
      { message: HttpStatusPhrases.NOT_FOUND },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  // Authorization: Only authenticated users can edit, and only their own comments
  const user = c.get("user");
  if (!user) {
    return c.json(
      { message: "Authentication required to update comments" },
      HttpStatusCodes.UNAUTHORIZED,
    );
  }

  // Check ownership - must have authorId and it must match
  if (!existingComment.authorId || existingComment.authorId !== user.id) {
    return c.json(
      { message: "You can only update your own comments" },
      HttpStatusCodes.FORBIDDEN,
    );
  }

  // Update with edit tracking
  const updated = await db
    .update(comments)
    .set({
      content: updates.content,
      isEdited: true,
      editedAt: new Date(),
    })
    .where(eq(comments.id, id))
    .returning()
    .get();

  if (!updated) {
    return c.json(
      { message: HttpStatusPhrases.NOT_FOUND },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  // Broadcast update
  wsManager.broadcast("comments", {
    type: "comment.updated",
    data: updated,
    timestamp: new Date().toISOString(),
  });

  wsManager.broadcast(`post:${updated.postId}:comments`, {
    type: "comment.updated",
    data: updated,
    timestamp: new Date().toISOString(),
  });

  // Publish to GraphQL subscriptions
  pubsub.publish(SUBSCRIPTION_EVENTS.COMMENT_UPDATED, { commentUpdated: updated });

  // Emit webhook event
  emitWebhookEvent("comment.updated", updated).catch(console.error);

  return c.json(updated, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const comment = await db.query.comments.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, id);
    },
  });

  if (!comment) {
    return c.json(
      { message: HttpStatusPhrases.NOT_FOUND },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  // Authorization: Only authenticated users can delete, and only their own comments
  const user = c.get("user");
  if (!user) {
    return c.json(
      { message: "Authentication required to delete comments" },
      HttpStatusCodes.UNAUTHORIZED,
    );
  }

  if (!comment.authorId || comment.authorId !== user.id) {
    return c.json(
      { message: "You can only delete your own comments" },
      HttpStatusCodes.FORBIDDEN,
    );
  }

  const result = await db.delete(comments).where(eq(comments.id, id));

  if (result.changes === 0) {
    return c.json(
      { message: HttpStatusPhrases.NOT_FOUND },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  // Broadcast deletion
  wsManager.broadcast("comments", {
    type: "comment.deleted",
    data: { id, postId: comment.postId },
    timestamp: new Date().toISOString(),
  });

  wsManager.broadcast(`post:${comment.postId}:comments`, {
    type: "comment.deleted",
    data: { id, postId: comment.postId },
    timestamp: new Date().toISOString(),
  });

  // Publish to GraphQL subscriptions
  pubsub.publish(SUBSCRIPTION_EVENTS.COMMENT_DELETED, { commentDeleted: { id, postId: comment.postId } });

  // Emit webhook event
  emitWebhookEvent("comment.deleted", { id, postId: comment.postId }).catch(console.error);

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};
