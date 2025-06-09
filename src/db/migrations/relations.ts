import { relations } from "drizzle-orm/relations";
import { tasks } from "./schema";

export const tasksRelations = relations(tasks, ({one, many}) => ({
	task_children: one(tasks, {
		fields: [tasks.children],
		references: [tasks.id],
		relationName: "tasks_children_tasks_id"
	}),
	tasks_children: many(tasks, {
		relationName: "tasks_children_tasks_id"
	}),
	task_parentId: one(tasks, {
		fields: [tasks.parentId],
		references: [tasks.id],
		relationName: "tasks_parentId_tasks_id"
	}),
	tasks_parentId: many(tasks, {
		relationName: "tasks_parentId_tasks_id"
	}),
}));