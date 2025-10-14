import { asc, desc, eq, sql } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import type { AppRouteHandler } from "@/lib/types";

import db from "@/db";
import { webhookEvents, webhookSubscriptions } from "@/db/schema";
import { notFoundSchema } from "@/lib/constants";

import type {
  CreateRoute,
  GetOneRoute,
  ListEventsRoute,
  ListRoute,
  PatchRoute,
  RemoveRoute,
  RetryEventRoute,
  TestRoute,
} from "./webhooks.routes";

// Helper to generate random secret
function generateSecret(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, "0")).join("");
}

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const { all, page, limit, active, sort = "DESC" } = c.req.valid("query");
  const user = c.get("user");

  // Build where conditions
  const whereConditions = [];

  // Only show user's own subscriptions
  if (user) {
    whereConditions.push(eq(webhookSubscriptions.owner, user.id));
  }
  else {
    // If not authenticated, don't show any subscriptions
    return c.json({
      data: [],
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

  if (active !== undefined) {
    whereConditions.push(eq(webhookSubscriptions.active, active));
  }

  const orderBy = sort === "ASC" ? [asc(webhookSubscriptions.createdAt)] : [desc(webhookSubscriptions.createdAt)];

  if (all) {
    const subscriptionsList = await db.query.webhookSubscriptions.findMany({
      where: whereConditions.length > 0 ? sql`${sql.join(whereConditions, sql` AND `)}` : undefined,
      limit: 200,
      orderBy,
    });
    return c.json(subscriptionsList, HttpStatusCodes.OK);
  }

  const offset = (page - 1) * limit;

  const [subscriptionsList, totalResult] = await Promise.all([
    db.query.webhookSubscriptions.findMany({
      where: whereConditions.length > 0 ? sql`${sql.join(whereConditions, sql` AND `)}` : undefined,
      limit,
      offset,
      orderBy,
    }),
    db.select({ count: sql<number>`count(*)` })
      .from(webhookSubscriptions)
      .where(whereConditions.length > 0 ? sql`${sql.join(whereConditions, sql` AND `)}` : undefined)
      .get(),
  ]);

  const totalCount = totalResult?.count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  return c.json({
    data: subscriptionsList,
    meta: {
      total: totalCount,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  }, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const subscriptionData = c.req.valid("json");
  const user = c.get("user");

  // Generate secret for HMAC signatures
  const secret = generateSecret();

  const subscriptionToInsert = {
    ...subscriptionData,
    secret,
    ...(user ? { owner: user.id } : {}),
  };

  const inserted = await db.insert(webhookSubscriptions).values(subscriptionToInsert).returning().get();

  return c.json(inserted, HttpStatusCodes.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const user = c.get("user");

  const subscription = await db.query.webhookSubscriptions.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, id);
    },
  });

  if (!subscription) {
    return c.json(
      notFoundSchema.parse({
        message: HttpStatusPhrases.NOT_FOUND,
      }),
      HttpStatusCodes.NOT_FOUND,
    );
  }

  // Check ownership
  if (subscription.owner && user && subscription.owner !== user.id) {
    return c.json(
      {
        message: "You can only view your own webhook subscriptions",
      },
      HttpStatusCodes.FORBIDDEN,
    );
  }

  return c.json(subscription, HttpStatusCodes.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const updates = c.req.valid("json");
  const user = c.get("user");

  // First, get the existing subscription to check ownership
  const existingSubscription = await db.query.webhookSubscriptions.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, id);
    },
  });

  if (!existingSubscription) {
    return c.json(
      {
        message: HttpStatusPhrases.NOT_FOUND,
      },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  // Check ownership if subscription has an owner
  if (existingSubscription.owner) {
    if (!user) {
      return c.json(
        {
          message: "Authentication required to update this webhook subscription",
        },
        HttpStatusCodes.UNAUTHORIZED,
      );
    }

    if (existingSubscription.owner !== user.id) {
      return c.json(
        {
          message: "You can only update your own webhook subscriptions",
        },
        HttpStatusCodes.FORBIDDEN,
      );
    }
  }

  // Build typed update object
  const updateData: Partial<typeof existingSubscription> = {};
  if (updates.url !== undefined)
    updateData.url = updates.url;
  if (updates.events !== undefined)
    updateData.events = updates.events;
  if (updates.active !== undefined)
    updateData.active = updates.active;
  if (updates.maxRetries !== undefined)
    updateData.maxRetries = updates.maxRetries;
  if (updates.retryBackoff !== undefined)
    updateData.retryBackoff = updates.retryBackoff;

  const subscription = await db
    .update(webhookSubscriptions)
    .set(updateData)
    .where(eq(webhookSubscriptions.id, id))
    .returning()
    .get();

  if (!subscription) {
    return c.json(
      {
        message: HttpStatusPhrases.NOT_FOUND,
      },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  return c.json(subscription, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const user = c.get("user");

  const subscription = await db.query.webhookSubscriptions.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, id);
    },
  });

  if (!subscription) {
    return c.json(
      {
        message: HttpStatusPhrases.NOT_FOUND,
      },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  // Check ownership if subscription has an owner
  if (subscription.owner) {
    if (!user) {
      return c.json(
        {
          message: "Authentication required to delete this webhook subscription",
        },
        HttpStatusCodes.UNAUTHORIZED,
      );
    }

    if (subscription.owner !== user.id) {
      return c.json(
        {
          message: "You can only delete your own webhook subscriptions",
        },
        HttpStatusCodes.FORBIDDEN,
      );
    }
  }

  const result = await db.delete(webhookSubscriptions).where(eq(webhookSubscriptions.id, id));

  if (result.changes === 0) {
    return c.json(
      {
        message: HttpStatusPhrases.NOT_FOUND,
      },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

export const test: AppRouteHandler<TestRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const subscription = await db.query.webhookSubscriptions.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, id);
    },
  });

  if (!subscription) {
    return c.json(
      notFoundSchema.parse({
        message: HttpStatusPhrases.NOT_FOUND,
      }),
      HttpStatusCodes.NOT_FOUND,
    );
  }

  // Send a test webhook
  const testPayload = {
    event: "webhook.test",
    timestamp: new Date().toISOString(),
    data: {
      message: "This is a test webhook from your API",
    },
  };

  const startTime = Date.now();

  try {
    const response = await fetch(subscription.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Event": "webhook.test",
        "X-Webhook-Timestamp": new Date().toISOString(),
      },
      body: JSON.stringify(testPayload),
    });

    const responseTime = Date.now() - startTime;

    return c.json({
      success: response.ok,
      message: response.ok ? "Test webhook delivered successfully" : "Test webhook failed",
      statusCode: response.status,
      responseTime,
    }, HttpStatusCodes.OK);
  }
  catch (error) {
    const responseTime = Date.now() - startTime;
    return c.json({
      success: false,
      message: `Test webhook failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      responseTime,
    }, HttpStatusCodes.OK);
  }
};

export const listEvents: AppRouteHandler<ListEventsRoute> = async (c) => {
  const { all, page, limit, subscriptionId, status, sort = "DESC" } = c.req.valid("query");
  const _user = c.get("user");

  // Build where conditions
  const whereConditions = [];

  if (subscriptionId) {
    whereConditions.push(eq(webhookEvents.subscriptionId, subscriptionId));
  }

  if (status) {
    whereConditions.push(eq(webhookEvents.status, status));
  }

  // TODO: Filter by user's subscriptions only
  // For now, we'll just return all events if user is authenticated

  const orderBy = sort === "ASC" ? [asc(webhookEvents.createdAt)] : [desc(webhookEvents.createdAt)];

  if (all) {
    const eventsList = await db.query.webhookEvents.findMany({
      where: whereConditions.length > 0 ? sql`${sql.join(whereConditions, sql` AND `)}` : undefined,
      limit: 200,
      orderBy,
    });
    return c.json(eventsList, HttpStatusCodes.OK);
  }

  const offset = (page - 1) * limit;

  const [eventsList, totalResult] = await Promise.all([
    db.query.webhookEvents.findMany({
      where: whereConditions.length > 0 ? sql`${sql.join(whereConditions, sql` AND `)}` : undefined,
      limit,
      offset,
      orderBy,
    }),
    db.select({ count: sql<number>`count(*)` })
      .from(webhookEvents)
      .where(whereConditions.length > 0 ? sql`${sql.join(whereConditions, sql` AND `)}` : undefined)
      .get(),
  ]);

  const totalCount = totalResult?.count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  return c.json({
    data: eventsList,
    meta: {
      total: totalCount,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  }, HttpStatusCodes.OK);
};

export const retryEvent: AppRouteHandler<RetryEventRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const event = await db.query.webhookEvents.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, id);
    },
  });

  if (!event) {
    return c.json(
      notFoundSchema.parse({
        message: HttpStatusPhrases.NOT_FOUND,
      }),
      HttpStatusCodes.NOT_FOUND,
    );
  }

  // Reset the event for retry
  await db
    .update(webhookEvents)
    .set({
      status: "pending",
      nextRetry: new Date(),
    })
    .where(eq(webhookEvents.id, id));

  return c.json({
    success: true,
    message: "Webhook event queued for retry",
  }, HttpStatusCodes.OK);
};
