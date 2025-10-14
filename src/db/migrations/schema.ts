import { sqliteTable, index, foreignKey, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core"

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
	foreignKey(({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "tasks_parent_id_tasks_id_fk"
		})),
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
	password: text(),
	name: text().notNull(),
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
	createdAt: integer("created_at"),
	updatedAt: integer("updated_at"),
});

export const session = sqliteTable("session", {
	id: text().primaryKey().notNull(),
	expiresAt: integer("expires_at").notNull(),
	token: text().notNull(),
	createdAt: integer("created_at"),
	updatedAt: integer("updated_at"),
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

export const posts = sqliteTable("posts", {
	id: text().primaryKey().notNull(),
	title: text().notNull(),
	slug: text().notNull(),
	content: text().notNull(),
	excerpt: text(),
	featuredImage: text("featured_image"),
	status: text().default("DRAFT").notNull(),
	category: text(),
	tags: text(),
	viewCount: integer("view_count").default(0).notNull(),
	publishedAt: integer("published_at"),
	author: text().references(() => users.id, { onDelete: "set null" } ),
	createdAt: integer("created_at"),
	updatedAt: integer("updated_at"),
},
(table) => [
	index("idx_posts_published_at").on(table.publishedAt),
	index("idx_posts_status").on(table.status),
	index("idx_posts_author").on(table.author),
	index("idx_posts_slug").on(table.slug),
	uniqueIndex("posts_slug_unique").on(table.slug),
]);

export const products = sqliteTable("products", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	price: integer().notNull(),
	compareAtPrice: integer("compare_at_price"),
	sku: text(),
	barcode: text(),
	quantity: integer().default(0).notNull(),
	category: text(),
	tags: text(),
	images: text().default("[]").notNull(),
	featured: integer().default(0).notNull(),
	published: integer().default(1).notNull(),
	owner: text().references(() => users.id, { onDelete: "set null" } ),
	createdAt: integer("created_at"),
	updatedAt: integer("updated_at"),
},
(table) => [
	index("idx_products_published").on(table.published),
	index("idx_products_owner").on(table.owner),
	index("idx_products_category").on(table.category),
]);

export const webhookEvents = sqliteTable("webhook_events", {
	id: text().primaryKey().notNull(),
	subscriptionId: text("subscription_id").notNull().references(() => webhookSubscriptions.id, { onDelete: "cascade" } ),
	eventType: text("event_type").notNull(),
	payload: text().notNull(),
	status: text().default("pending").notNull(),
	attempts: integer().default(0).notNull(),
	lastAttempt: integer("last_attempt"),
	nextRetry: integer("next_retry"),
	responseCode: integer("response_code"),
	responseBody: text("response_body"),
	errorMessage: text("error_message"),
	createdAt: integer("created_at"),
	updatedAt: integer("updated_at"),
},
(table) => [
	index("idx_webhook_events_created_at").on(table.createdAt),
	index("idx_webhook_events_next_retry").on(table.nextRetry),
	index("idx_webhook_events_status").on(table.status),
	index("idx_webhook_events_subscription_id").on(table.subscriptionId),
]);

export const webhookIncomingLogs = sqliteTable("webhook_incoming_logs", {
	id: text().primaryKey().notNull(),
	provider: text().notNull(),
	eventId: text("event_id").notNull(),
	eventType: text("event_type").notNull(),
	payload: text().notNull(),
	signature: text(),
	verified: integer().default(0).notNull(),
	processed: integer().default(0).notNull(),
	processedAt: integer("processed_at"),
	errorMessage: text("error_message"),
	receivedAt: integer("received_at"),
},
(table) => [
	index("idx_webhook_incoming_logs_received_at").on(table.receivedAt),
	index("idx_webhook_incoming_logs_processed").on(table.processed),
	index("idx_webhook_incoming_logs_event_id").on(table.eventId),
	index("idx_webhook_incoming_logs_provider").on(table.provider),
	uniqueIndex("webhook_incoming_logs_event_id_unique").on(table.eventId),
]);

export const webhookSubscriptions = sqliteTable("webhook_subscriptions", {
	id: text().primaryKey().notNull(),
	url: text().notNull(),
	events: text().default("[]").notNull(),
	secret: text().notNull(),
	active: integer().default(1).notNull(),
	maxRetries: integer("max_retries").default(6).notNull(),
	retryBackoff: text("retry_backoff").default("exponential").notNull(),
	owner: text().references(() => users.id, { onDelete: "cascade" } ),
	createdAt: integer("created_at"),
	updatedAt: integer("updated_at"),
},
(table) => [
	index("idx_webhook_subscriptions_active").on(table.active),
	index("idx_webhook_subscriptions_owner").on(table.owner),
]);
