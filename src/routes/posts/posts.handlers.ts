import type { z } from "zod/v4";

import { asc, desc, eq, sql } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import type { selectPostsSchema } from "@/db/schema";
import type { AppRouteHandler } from "@/lib/types";

import db from "@/db";
import { posts } from "@/db/schema";
import { notFoundSchema, ZOD_ERROR_CODES, ZOD_ERROR_MESSAGES } from "@/lib/constants";
import { pubsub, SUBSCRIPTION_EVENTS } from "@/lib/pubsub";
import { emitWebhookEvent } from "@/lib/webhook-service";
import { wsManager } from "@/routes/websockets/websocket.manager";
import { ensureUniqueSlug, generateSlugFromTitle } from "@/utils/slug";

import type { CreateRoute, GetBySlugRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from "./posts.routes";

export type Post = z.infer<typeof selectPostsSchema>;

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const { all, page, limit, category, status, search, sort = "DESC" } = c.req.valid("query");

  // Build where conditions
  const whereConditions = [];
  if (category)
    whereConditions.push(eq(posts.category, category));
  if (status)
    whereConditions.push(eq(posts.status, status));
  if (search) {
    const searchPattern = `%${search}%`;
    whereConditions.push(
      sql`(${posts.title} LIKE ${searchPattern} OR ${posts.content} LIKE ${searchPattern} OR ${posts.excerpt} LIKE ${searchPattern})`,
    );
  }

  const orderBy = sort === "ASC" ? [asc(posts.publishedAt)] : [desc(posts.publishedAt)];

  if (all) {
    const postsList = await db.query.posts.findMany({
      where: whereConditions.length > 0 ? sql`${sql.join(whereConditions, sql` AND `)}` : undefined,
      limit: 200,
      orderBy,
    });
    return c.json(postsList as Post[], HttpStatusCodes.OK);
  }
  else {
    const offset = (page - 1) * limit;

    const [postsList, totalResult] = await Promise.all([
      db.query.posts.findMany({
        where: whereConditions.length > 0 ? sql`${sql.join(whereConditions, sql` AND `)}` : undefined,
        limit,
        offset,
        orderBy,
      }),
      db.select({ count: sql<number>`count(*)` })
        .from(posts)
        .where(whereConditions.length > 0 ? sql`${sql.join(whereConditions, sql` AND `)}` : undefined)
        .get(),
    ]);

    if (!totalResult) {
      return c.json({
        data: [] as Post[],
        meta: {
          total: 0,
          page,
          limit,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      }, HttpStatusCodes.OK);
    }

    const totalCount = totalResult?.count ?? 0;
    const totalPages = Math.ceil(totalCount / limit);

    return c.json({
      data: postsList as Post[],
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
  const postData = c.req.valid("json");

  // Get authenticated user if available and set as author
  const user = c.get("user");

  // Generate or validate slug
  let finalSlug: string;
  if (postData.slug) {
    // User provided slug - ensure it's unique
    finalSlug = await ensureUniqueSlug(postData.slug);
  }
  else {
    // Generate slug from title
    const baseSlug = generateSlugFromTitle(postData.title);
    finalSlug = await ensureUniqueSlug(baseSlug);
  }

  const postToInsert = {
    ...postData,
    slug: finalSlug,
    ...(user ? { author: user.id } : {}),
  };

  // Set publishedAt if status is PUBLISHED and publishedAt is not set
  const shouldSetPublishedAt = postToInsert.status === "PUBLISHED" && !postToInsert.publishedAt;

  const inserted = await db.insert(posts).values({
    ...postToInsert,
    publishedAt: shouldSetPublishedAt ? new Date() : postToInsert.publishedAt,
    status: postToInsert.status && typeof postToInsert.status === "string" ? postToInsert.status : "DRAFT",
  }).returning().get();

  // Broadcast post creation to WebSocket clients
  wsManager.broadcast("posts", {
    type: "post.created",
    data: inserted,
    timestamp: new Date().toISOString(),
  });

  // Publish to GraphQL subscriptions - different events for published vs draft posts
  if (inserted.status === "PUBLISHED") {
    pubsub.publish(SUBSCRIPTION_EVENTS.POST_PUBLISHED, { postPublished: inserted });
  }
  else {
    pubsub.publish(SUBSCRIPTION_EVENTS.POST_CREATED, { postCreated: inserted });
  }

  // Emit webhook event - use different event type for published posts
  const eventType = inserted.status === "PUBLISHED" ? "post.published" : "post.created";
  emitWebhookEvent(eventType, inserted).catch(console.error);

  return c.json(inserted, HttpStatusCodes.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");

  // First, try to find by ID (UUID)
  let post = await db.query.posts.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, id);
    },
  });

  // If not found by ID, try by slug (fallback for user-friendly URLs)
  if (!post) {
    post = await db.query.posts.findFirst({
      where(fields, operators) {
        return operators.eq(fields.slug, id);
      },
    });
  }

  if (!post) {
    return c.json(
      notFoundSchema.parse({
        message: HttpStatusPhrases.NOT_FOUND,
      }),
      HttpStatusCodes.NOT_FOUND,
    );
  }

  // Increment view count (use post.id, not the param which might be slug)
  await db.update(posts)
    .set({ viewCount: post.viewCount + 1 })
    .where(eq(posts.id, post.id));

  return c.json({ ...post, viewCount: post.viewCount + 1 }, HttpStatusCodes.OK);
};

export const getBySlug: AppRouteHandler<GetBySlugRoute> = async (c) => {
  const { slug } = c.req.valid("param");
  const post = await db.query.posts.findFirst({
    where(fields, operators) {
      return operators.eq(fields.slug, slug);
    },
  });

  if (!post) {
    return c.json(
      notFoundSchema.parse({
        message: HttpStatusPhrases.NOT_FOUND,
      }),
      HttpStatusCodes.NOT_FOUND,
    );
  }

  // Increment view count
  await db.update(posts)
    .set({ viewCount: post.viewCount + 1 })
    .where(eq(posts.slug, slug));

  return c.json({ ...post, viewCount: post.viewCount + 1 }, HttpStatusCodes.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const updates = c.req.valid("json");

  const hasValidUpdates = Object.values(updates).some(value => value !== undefined && value !== null);

  if (!hasValidUpdates) {
    return c.json(
      {
        success: false,
        error: {
          issues: [
            {
              code: ZOD_ERROR_CODES.INVALID_UPDATES,
              path: [],
              message: ZOD_ERROR_MESSAGES.NO_UPDATES,
            },
          ],
          name: "ZodError",
        },
      },
      HttpStatusCodes.UNPROCESSABLE_ENTITY,
    );
  }

  // First, get the existing post to check authorship
  const existingPost = await db.query.posts.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, id);
    },
  });

  if (!existingPost) {
    return c.json(
      {
        message: HttpStatusPhrases.NOT_FOUND,
      },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  // Check authorship if post has an author
  if (existingPost.author) {
    const user = c.get("user");
    if (!user) {
      return c.json(
        {
          message: "Authentication required to update this post",
        },
        HttpStatusCodes.UNAUTHORIZED,
      );
    }

    if (existingPost.author !== user.id) {
      return c.json(
        {
          message: "You can only update posts you authored",
        },
        HttpStatusCodes.FORBIDDEN,
      );
    }
  }

  // Build update object with proper types
  const updateData: Partial<typeof existingPost> = {};

  // Copy all valid update fields
  if (updates.title !== undefined)
    updateData.title = updates.title;

  // Handle slug - regenerate if title changed but slug not provided
  if (updates.slug !== undefined && updates.slug !== null) {
    // User provided new slug - ensure it's unique
    updateData.slug = await ensureUniqueSlug(updates.slug, id);
  }
  else if (updates.title !== undefined && updates.title !== existingPost.title) {
    // Title changed but no slug provided - regenerate from new title
    const baseSlug = generateSlugFromTitle(updates.title);
    updateData.slug = await ensureUniqueSlug(baseSlug, id);
  }

  if (updates.content !== undefined)
    updateData.content = updates.content;
  if (updates.excerpt !== undefined)
    updateData.excerpt = updates.excerpt;
  if (updates.featuredImage !== undefined)
    updateData.featuredImage = updates.featuredImage;
  if (updates.category !== undefined)
    updateData.category = updates.category;
  if (updates.tags !== undefined)
    updateData.tags = updates.tags;
  if (updates.publishedAt !== undefined)
    updateData.publishedAt = updates.publishedAt;

  // Handle status field
  if (updates.status !== undefined) {
    if (typeof updates.status === "string" && ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(updates.status)) {
      updateData.status = updates.status as "DRAFT" | "PUBLISHED" | "ARCHIVED";
    }
  }

  // If status is being changed to PUBLISHED and publishedAt is not set, set it now
  if (updateData.status === "PUBLISHED" && !existingPost.publishedAt && !updateData.publishedAt) {
    updateData.publishedAt = new Date();
  }

  const post = await db
    .update(posts)
    .set(updateData)
    .where(eq(posts.id, id))
    .returning()
    .get();

  if (!post) {
    return c.json(
      {
        message: HttpStatusPhrases.NOT_FOUND,
      },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  // Broadcast post update to WebSocket clients
  wsManager.broadcast("posts", {
    type: "post.updated",
    data: post,
    timestamp: new Date().toISOString(),
  });

  // Also broadcast to specific post channel
  wsManager.broadcast(`post:${post.id}`, {
    type: "post.updated",
    data: post,
    timestamp: new Date().toISOString(),
  });

  // Publish to GraphQL subscriptions - check if post was just published
  const wasPublished = existingPost.status !== "PUBLISHED" && post.status === "PUBLISHED";
  if (wasPublished) {
    pubsub.publish(SUBSCRIPTION_EVENTS.POST_PUBLISHED, { postPublished: post });
  }
  else {
    pubsub.publish(SUBSCRIPTION_EVENTS.POST_UPDATED, { postUpdated: post });
  }

  // Emit webhook event - check if status changed to PUBLISHED
  const eventType = wasPublished ? "post.published" : "post.updated";
  emitWebhookEvent(eventType, post).catch(console.error);

  return c.json(post, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const post = await db.query.posts.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, id);
    },
  });

  if (!post) {
    return c.json(
      {
        message: HttpStatusPhrases.NOT_FOUND,
      },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  if (post && post.isDefault) {
    return c.json({ success: true, message: "Default post removed successfully" }, HttpStatusCodes.OK);
  }

  // Check authorship if post has an author
  if (post.author) {
    const user = c.get("user");
    if (!user) {
      return c.json(
        {
          message: "Authentication required to delete this post",
        },
        HttpStatusCodes.UNAUTHORIZED,
      );
    }

    if (post.author !== user.id) {
      return c.json(
        {
          message: "You can only delete posts you authored",
        },
        HttpStatusCodes.FORBIDDEN,
      );
    }
  }

  const result = await db.delete(posts).where(eq(posts.id, id));

  if (result.changes === 0) {
    return c.json(
      {
        message: HttpStatusPhrases.NOT_FOUND,
      },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  // Broadcast post deletion to WebSocket clients
  wsManager.broadcast("posts", {
    type: "post.deleted",
    data: { id },
    timestamp: new Date().toISOString(),
  });

  // Also broadcast to specific post channel
  wsManager.broadcast(`post:${id}`, {
    type: "post.deleted",
    data: { id },
    timestamp: new Date().toISOString(),
  });

  // Publish to GraphQL subscriptions
  pubsub.publish(SUBSCRIPTION_EVENTS.POST_DELETED, { postDeleted: { id } });

  // Emit webhook event
  emitWebhookEvent("post.deleted", { id }).catch(console.error);

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};
