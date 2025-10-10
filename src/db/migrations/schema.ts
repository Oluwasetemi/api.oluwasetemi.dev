import { sqliteTable, AnySQLiteColumn, index, foreignKey, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core"
  import { sql } from "drizzle-orm"

export const tasks = sqliteTable("tasks", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	start: integer(),
	end: integer(),
	duration: integer(),
	priority: text().default("MEDIUM").notNull(),
	status: text().default("TODO").notNull(),
	archived: integer().default(0).notNull(),
	parentId: text("parent_id"),
	children: text().default("[]").notNull(),
	owner: text(),
	tags: text(),
	completedAt: integer("completed_at"),
	createdAt: integer("created_at"),
	updatedAt: integer("updated_at"),
	isDefault: integer("is_default").default(0),
},
(table) => [
	index("idx_tasks_parent_id").on(table.parentId),
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "tasks_parent_id_tasks_id_fk"
		}),
]);

export const requests = sqliteTable("requests", {
	id: text().primaryKey().notNull(),
	method: text().notNull(),
	path: text().notNull(),
	status: integer().notNull(),
	durationMs: integer("duration_ms").notNull(),
	createdAt: integer("created_at"),
	ip: text(),
	userAgent: text("user_agent"),
	referer: text(),
},
(table) => [
	index("idx_requests_path").on(table.path),
	index("idx_requests_status").on(table.status),
	index("idx_requests_method").on(table.method),
	index("idx_requests_created_at").on(table.createdAt),
]);

export const users = sqliteTable("users", {
	id: text().primaryKey().notNull(),
	email: text().notNull(),
	password: text().notNull(),
	name: text(),
	isActive: integer("is_active").default(1).notNull(),
	lastLoginAt: integer("last_login_at"),
	createdAt: integer("created_at"),
	updatedAt: integer("updated_at"),
	imageUrl: text("image_url"),
	emailVerified: integer("email_verified").default(0).notNull(),
},
(table) => [
	index("idx_users_is_active").on(table.isActive),
	index("idx_users_email").on(table.email),
	uniqueIndex("users_email_unique").on(table.email),
]);

export const account = sqliteTable("account", {
	id: text().primaryKey().notNull(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: integer("access_token_expires_at"),
	refreshTokenExpiresAt: integer("refresh_token_expires_at"),
	scope: text(),
	password: text(),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull(),
});

export const session = sqliteTable("session", {
	id: text().primaryKey().notNull(),
	expiresAt: integer("expires_at").notNull(),
	token: text().notNull(),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
},
(table) => [
	uniqueIndex("session_token_unique").on(table.token),
]);

export const verification = sqliteTable("verification", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: integer("expires_at").notNull(),
	createdAt: integer("created_at"),
	updatedAt: integer("updated_at"),
});
