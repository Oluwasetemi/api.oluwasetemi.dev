CREATE TABLE `webhook_events` (
	`id` text PRIMARY KEY NOT NULL,
	`subscription_id` text NOT NULL,
	`event_type` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_attempt` integer,
	`next_retry` integer,
	`response_code` integer,
	`response_body` text,
	`error_message` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`subscription_id`) REFERENCES `webhook_subscriptions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_webhook_events_subscription_id` ON `webhook_events` (`subscription_id`);--> statement-breakpoint
CREATE INDEX `idx_webhook_events_status` ON `webhook_events` (`status`);--> statement-breakpoint
CREATE INDEX `idx_webhook_events_next_retry` ON `webhook_events` (`next_retry`);--> statement-breakpoint
CREATE INDEX `idx_webhook_events_created_at` ON `webhook_events` (`created_at`);--> statement-breakpoint
CREATE TABLE `webhook_incoming_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`event_id` text NOT NULL,
	`event_type` text NOT NULL,
	`payload` text NOT NULL,
	`signature` text,
	`verified` integer DEFAULT false NOT NULL,
	`processed` integer DEFAULT false NOT NULL,
	`processed_at` integer,
	`error_message` text,
	`received_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `webhook_incoming_logs_event_id_unique` ON `webhook_incoming_logs` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_webhook_incoming_logs_provider` ON `webhook_incoming_logs` (`provider`);--> statement-breakpoint
CREATE INDEX `idx_webhook_incoming_logs_event_id` ON `webhook_incoming_logs` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_webhook_incoming_logs_processed` ON `webhook_incoming_logs` (`processed`);--> statement-breakpoint
CREATE INDEX `idx_webhook_incoming_logs_received_at` ON `webhook_incoming_logs` (`received_at`);--> statement-breakpoint
CREATE TABLE `webhook_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`events` text DEFAULT '[]' NOT NULL,
	`secret` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`max_retries` integer DEFAULT 6 NOT NULL,
	`retry_backoff` text DEFAULT 'exponential' NOT NULL,
	`owner` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`owner`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_webhook_subscriptions_owner` ON `webhook_subscriptions` (`owner`);--> statement-breakpoint
CREATE INDEX `idx_webhook_subscriptions_active` ON `webhook_subscriptions` (`active`);