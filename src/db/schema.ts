import type { SQLiteColumn } from "drizzle-orm/sqlite-core";

import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { generateUUID } from "@/utils/uuid";

// Define enums
export const PriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH"]);
export const StatusEnum = z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]);

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey().$defaultFn(() => generateUUID()),
  name: text().notNull(),
  description: text(),
  start: integer({ mode: "timestamp" }),
  end: integer({ mode: "timestamp" }),
  duration: integer({ mode: "number" }),
  priority: text({ enum: ["LOW", "MEDIUM", "HIGH"] }).notNull().default("MEDIUM"),
  status: text({ enum: ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"] }).notNull().default("TODO"),
  archived: integer({ mode: "boolean" }).notNull().default(false),
  isDefault: integer({ mode: "boolean" }).default(false),
  parentId: text("parent_id").references((): SQLiteColumn<any, object, object> => tasks.id),
  children: text().notNull().default("[]"), // Remove the reference, store as JSON
  owner: text(),
  tags: text(),
  completedAt: integer({ mode: "timestamp" }),
  createdAt: integer({ mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer({ mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
}, table => [
  index("idx_tasks_parent_id").on(table.parentId),
]);

export const selectTasksSchema = createSelectSchema(tasks);

export const insertTasksSchema = createInsertSchema(tasks, {
  name: schema => schema.name.min(1).max(500),
  description: schema => schema.description.max(1000),
  priority: schema => schema.priority.refine(val => PriorityEnum.safeParse(val).success),
  status: schema => schema.status.refine(val => StatusEnum.safeParse(val).success),
  archived: schema => schema.archived.optional(),
  children: schema => schema.children.refine((val) => {
    if (!val || val === "")
      return true;
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) && parsed.every(id => typeof id === "string");
    }
    catch {
      return false;
    }
  }, { message: "Children must be a valid JSON array of strings" }),
  start: schema => schema.start.optional().nullable().transform(val => val ? new Date(val) : null),
  end: schema => schema.end.optional().nullable().transform(val => val ? new Date(val) : null),
  completedAt: schema => schema.completedAt.optional().nullable().transform(val => val ? new Date(val) : null),
})
  .required({
    name: true,
    status: true,
  })
  .omit({
    id: true, // Don't allow manual ID setting
    createdAt: true,
    updatedAt: true,
  });

export const patchTasksSchema = insertTasksSchema.partial().refine(
  data => Object.keys(data).length > 0,
  { message: "No updates provided", path: [] },
);

// Requests table for analytics
export const requests = sqliteTable("requests", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  method: text().notNull(),
  path: text().notNull(),
  status: integer().notNull(),
  durationMs: integer("duration_ms").notNull(),
  createdAt: integer({ mode: "timestamp" }).$defaultFn(() => new Date()),
  // Optional fields for richer analytics
  ip: text(),
  userAgent: text("user_agent"),
  referer: text(),
}, table => [
  index("idx_requests_created_at").on(table.createdAt),
  index("idx_requests_method").on(table.method),
  index("idx_requests_status").on(table.status),
  index("idx_requests_path").on(table.path),
]);

export const selectRequestsSchema = createSelectSchema(requests);

export const insertRequestsSchema = createInsertSchema(requests, {
  method: schema => schema.method.min(1).max(10),
  path: schema => schema.path.min(1).max(2048),
  status: schema => schema.status.min(100).max(599),
  durationMs: schema => schema.durationMs.min(0),
  ip: schema => schema.ip.optional().nullable(),
  userAgent: schema => schema.userAgent.optional().nullable(),
  referer: schema => schema.referer.optional().nullable(),
})
  .omit({
    id: true,
    createdAt: true,
  });

export const patchRequestsSchema = insertRequestsSchema.partial();

// Users table for authentication - Compatible with Better Auth and existing schema
export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => generateUUID()),
  email: text().notNull().unique(),
  name: text().notNull(),
  password: text("password"),
  image: text("image_url"),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  isActive: integer({ mode: "boolean" }).notNull().default(true),
  lastLoginAt: integer({ mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
}, table => [
  index("idx_users_email").on(table.email),
  index("idx_users_is_active").on(table.isActive),
]);

export const selectUsersSchema = createSelectSchema(users);

export const insertUsersSchema = createInsertSchema(users, {
  email: schema => schema.email.email().min(1).max(255),
  name: schema => schema.name.min(1).max(255),
  image: schema => schema.image.optional().nullable().refine(val => !val || z.url().safeParse(val).success, { message: "Must be a valid URL" }).transform(val => val || null),
})
  .required({
    email: true,
    name: true,
  })
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

export const patchUsersSchema = insertUsersSchema.partial();

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

// Products table
export const products = sqliteTable("products", {
  id: text("id").primaryKey().$defaultFn(() => generateUUID()),
  name: text().notNull(),
  description: text(),
  price: integer({ mode: "number" }).notNull(),
  compareAtPrice: integer("compare_at_price", { mode: "number" }),
  sku: text(),
  barcode: text(),
  quantity: integer({ mode: "number" }).notNull().default(0),
  category: text(),
  tags: text(),
  images: text().notNull().default("[]"), // JSON array of image URLs
  featured: integer({ mode: "boolean" }).notNull().default(false),
  published: integer({ mode: "boolean" }).notNull().default(true),
  isDefault: integer({ mode: "boolean" }).default(false),
  owner: text().references(() => users.id, { onDelete: "set null" }),
  createdAt: integer({ mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer({ mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
}, table => [
  index("idx_products_category").on(table.category),
  index("idx_products_owner").on(table.owner),
  index("idx_products_published").on(table.published),
]);

export const selectProductsSchema = createSelectSchema(products);

export const insertProductsSchema = createInsertSchema(products, {
  name: schema => schema.name.min(1).max(500),
  description: schema => schema.description.optional().nullable(),
  price: schema => schema.price.min(0),
  compareAtPrice: schema => schema.compareAtPrice.optional().nullable(),
  sku: schema => schema.sku.optional().nullable(),
  barcode: schema => schema.barcode.optional().nullable(),
  quantity: schema => schema.quantity.min(0),
  category: schema => schema.category.optional().nullable(),
  tags: schema => schema.tags.optional().nullable(),
  images: schema => schema.images.optional(),
})
  .required({
    name: true,
    price: true,
  })
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

export const patchProductsSchema = insertProductsSchema.partial();

// Posts table
export const posts = sqliteTable("posts", {
  id: text("id").primaryKey().$defaultFn(() => generateUUID()),
  title: text().notNull(),
  slug: text().unique(), // Made optional - will be auto-generated from title if not provided
  content: text().notNull(),
  excerpt: text(),
  featuredImage: text("featured_image"),
  status: text({ enum: ["DRAFT", "PUBLISHED", "ARCHIVED"] }).notNull().default("DRAFT"),
  category: text(),
  tags: text(),
  viewCount: integer("view_count", { mode: "number" }).notNull().default(0),
  publishedAt: integer({ mode: "timestamp" }),
  isDefault: integer({ mode: "boolean" }).default(false),
  author: text().references(() => users.id, { onDelete: "set null" }),
  createdAt: integer({ mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer({ mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
}, table => [
  index("idx_posts_slug").on(table.slug),
  index("idx_posts_author").on(table.author),
  index("idx_posts_status").on(table.status),
  index("idx_posts_published_at").on(table.publishedAt),
]);

export const selectPostsSchema = createSelectSchema(posts);

export const insertPostsSchema = createInsertSchema(posts, {
  title: schema => schema.title.min(1).max(500),
  slug: schema => schema.slug.optional().refine(
    val => !val || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(val),
    { message: "Slug must be lowercase alphanumeric with hyphens" },
  ),
  content: schema => schema.content.min(1),
  excerpt: schema => schema.excerpt.optional().nullable(),
  featuredImage: schema => schema.featuredImage.optional().nullable(),
  category: schema => schema.category.optional().nullable(),
  tags: schema => schema.tags.optional().nullable(),
  publishedAt: schema => schema.publishedAt.optional().nullable(),
})
  .required({
    title: true,
    content: true,
  })
  .omit({
    id: true,
    viewCount: true,
    createdAt: true,
    updatedAt: true,
  });

export const patchPostsSchema = insertPostsSchema.partial();

// Webhook Subscriptions table
export const webhookSubscriptions = sqliteTable("webhook_subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => generateUUID()),
  url: text().notNull(),
  events: text().notNull().default("[]"), // JSON array of event types
  secret: text().notNull(), // HMAC secret for signature
  active: integer({ mode: "boolean" }).notNull().default(true),
  maxRetries: integer("max_retries", { mode: "number" }).notNull().default(6),
  retryBackoff: text("retry_backoff").notNull().default("exponential"), // exponential or linear
  owner: text().references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer({ mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer({ mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
}, table => [
  index("idx_webhook_subscriptions_owner").on(table.owner),
  index("idx_webhook_subscriptions_active").on(table.active),
]);

export const selectWebhookSubscriptionsSchema = createSelectSchema(webhookSubscriptions);

export const insertWebhookSubscriptionsSchema = createInsertSchema(webhookSubscriptions, {
  url: schema => schema.url.url().min(1).max(2048),
  events: schema => schema.events.refine((val) => {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) && parsed.every(e => typeof e === "string");
    }
    catch {
      return false;
    }
  }, { message: "Events must be a valid JSON array of strings" }),
  secret: schema => schema.secret.min(32).max(256),
  maxRetries: schema => schema.maxRetries.min(0).max(10),
  retryBackoff: schema => schema.retryBackoff.refine(val => ["exponential", "linear"].includes(val), {
    message: "Retry backoff must be 'exponential' or 'linear'",
  }),
})
  .required({
    url: true,
    events: true,
  })
  .omit({
    id: true,
    secret: true, // Auto-generated
    createdAt: true,
    updatedAt: true,
  });

export const patchWebhookSubscriptionsSchema = insertWebhookSubscriptionsSchema.partial();

// Webhook Events table (delivery history)
export const webhookEvents = sqliteTable("webhook_events", {
  id: text("id").primaryKey().$defaultFn(() => generateUUID()),
  subscriptionId: text("subscription_id").notNull().references(() => webhookSubscriptions.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  payload: text().notNull(), // JSON payload
  status: text({ enum: ["pending", "delivered", "failed"] }).notNull().default("pending"),
  attempts: integer({ mode: "number" }).notNull().default(0),
  lastAttempt: integer("last_attempt", { mode: "timestamp" }),
  nextRetry: integer("next_retry", { mode: "timestamp" }),
  responseCode: integer("response_code", { mode: "number" }),
  responseBody: text("response_body"),
  errorMessage: text("error_message"),
  createdAt: integer({ mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer({ mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
}, table => [
  index("idx_webhook_events_subscription_id").on(table.subscriptionId),
  index("idx_webhook_events_status").on(table.status),
  index("idx_webhook_events_next_retry").on(table.nextRetry),
  index("idx_webhook_events_created_at").on(table.createdAt),
]);

export const selectWebhookEventsSchema = createSelectSchema(webhookEvents);

export const insertWebhookEventsSchema = createInsertSchema(webhookEvents, {
  eventType: schema => schema.eventType.min(1).max(100),
  payload: schema => schema.payload.refine((val) => {
    try {
      JSON.parse(val);
      return true;
    }
    catch {
      return false;
    }
  }, { message: "Payload must be valid JSON" }),
  attempts: schema => schema.attempts.min(0),
  responseCode: schema => schema.responseCode.optional().nullable().refine(val => !val || (val >= 100 && val <= 599), {
    message: "Response code must be between 100 and 599",
  }),
})
  .required({
    subscriptionId: true,
    eventType: true,
    payload: true,
  })
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

export const patchWebhookEventsSchema = insertWebhookEventsSchema.partial();

// Webhook Incoming Logs table (for receiving webhooks from external services)
export const webhookIncomingLogs = sqliteTable("webhook_incoming_logs", {
  id: text("id").primaryKey().$defaultFn(() => generateUUID()),
  provider: text().notNull(), // e.g., "github", "stripe", "generic"
  eventId: text("event_id").notNull().unique(), // For idempotency
  eventType: text("event_type").notNull(),
  payload: text().notNull(), // JSON payload
  signature: text(),
  verified: integer({ mode: "boolean" }).notNull().default(false),
  processed: integer({ mode: "boolean" }).notNull().default(false),
  processedAt: integer("processed_at", { mode: "timestamp" }),
  errorMessage: text("error_message"),
  receivedAt: integer("received_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
}, table => [
  index("idx_webhook_incoming_logs_provider").on(table.provider),
  index("idx_webhook_incoming_logs_event_id").on(table.eventId),
  index("idx_webhook_incoming_logs_processed").on(table.processed),
  index("idx_webhook_incoming_logs_received_at").on(table.receivedAt),
]);

export const selectWebhookIncomingLogsSchema = createSelectSchema(webhookIncomingLogs);

export const insertWebhookIncomingLogsSchema = createInsertSchema(webhookIncomingLogs, {
  provider: schema => schema.provider.min(1).max(100),
  eventId: schema => schema.eventId.min(1).max(255),
  eventType: schema => schema.eventType.min(1).max(100),
  payload: schema => schema.payload.refine((val) => {
    try {
      JSON.parse(val);
      return true;
    }
    catch {
      return false;
    }
  }, { message: "Payload must be valid JSON" }),
  signature: schema => schema.signature.optional().nullable(),
})
  .required({
    provider: true,
    eventId: true,
    eventType: true,
    payload: true,
  })
  .omit({
    id: true,
    receivedAt: true,
  });

export const patchWebhookIncomingLogsSchema = insertWebhookIncomingLogsSchema.partial();
