import { sqliteTable, AnySQLiteColumn, uniqueIndex, foreignKey, text, integer } from "drizzle-orm/sqlite-core"
  import { sql } from "drizzle-orm"

export const tasks = sqliteTable("tasks", {
	id: text().notNull(),
	name: text().notNull(),
	description: text(),
	start: integer(),
	end: integer(),
	duration: integer(),
	priority: text().default("MEDIUM"),
	status: text().default("TODO").notNull(),
	archived: integer().default(false).notNull(),
	parentId: text("parent_id"),
	children: text(),
	owner: text().notNull(),
	createdAt: integer("created_at"),
	updatedAt: integer("updated_at"),
},
(table) => [
	uniqueIndex("tasks_id_unique").on(table.id),
	foreignKey(() => ({
			columns: [table.children],
			foreignColumns: [table.id],
			name: "tasks_children_tasks_id_fk"
		})),
	foreignKey(() => ({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "tasks_parent_id_tasks_id_fk"
		})),
]);

