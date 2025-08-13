import { relations } from "drizzle-orm/relations";
import { tasks, users, account, session } from "./schema";

export const tasksRelations = relations(tasks, ({one, many}) => ({
	task: one(tasks, {
		fields: [tasks.parentId],
		references: [tasks.id],
		relationName: "tasks_parentId_tasks_id"
	}),
	tasks: many(tasks, {
		relationName: "tasks_parentId_tasks_id"
	}),
}));

export const accountRelations = relations(account, ({one}) => ({
	user: one(users, {
		fields: [account.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	accounts: many(account),
	sessions: many(session),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(users, {
		fields: [session.userId],
		references: [users.id]
	}),
}));