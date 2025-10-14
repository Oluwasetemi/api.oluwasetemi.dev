import { relations } from "drizzle-orm/relations";
import { tasks, users, account, session, posts, products, webhookSubscriptions, webhookEvents } from "./schema";

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
	posts: many(posts),
	products: many(products),
	webhookSubscriptions: many(webhookSubscriptions),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(users, {
		fields: [session.userId],
		references: [users.id]
	}),
}));

export const postsRelations = relations(posts, ({one}) => ({
	user: one(users, {
		fields: [posts.author],
		references: [users.id]
	}),
}));

export const productsRelations = relations(products, ({one}) => ({
	user: one(users, {
		fields: [products.owner],
		references: [users.id]
	}),
}));

export const webhookEventsRelations = relations(webhookEvents, ({one}) => ({
	webhookSubscription: one(webhookSubscriptions, {
		fields: [webhookEvents.subscriptionId],
		references: [webhookSubscriptions.id]
	}),
}));

export const webhookSubscriptionsRelations = relations(webhookSubscriptions, ({one, many}) => ({
	webhookEvents: many(webhookEvents),
	user: one(users, {
		fields: [webhookSubscriptions.owner],
		references: [users.id]
	}),
}));