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
    parentId: text("parent_id").references(() => tasks.id),
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
