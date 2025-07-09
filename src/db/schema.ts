import type { SQLiteColumn } from "drizzle-orm/sqlite-core";

import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Define enums
export const PriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH"]);
export const StatusEnum = z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]);

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()), // Make this the primary key
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

export const patchTasksSchema = insertTasksSchema.partial();

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
