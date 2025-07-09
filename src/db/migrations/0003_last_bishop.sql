CREATE TABLE `requests` (
	`id` text PRIMARY KEY NOT NULL,
	`method` text NOT NULL,
	`path` text NOT NULL,
	`status` integer NOT NULL,
	`duration_ms` integer NOT NULL,
	`created_at` integer,
	`ip` text,
	`user_agent` text,
	`referer` text
);
--> statement-breakpoint
CREATE INDEX `idx_requests_created_at` ON `requests` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_requests_method` ON `requests` (`method`);--> statement-breakpoint
CREATE INDEX `idx_requests_status` ON `requests` (`status`);--> statement-breakpoint
CREATE INDEX `idx_requests_path` ON `requests` (`path`);--> statement-breakpoint
CREATE INDEX `idx_tasks_parent_id` ON `tasks` (`parent_id`);--> statement-breakpoint
ALTER TABLE `tasks` ADD `is_default` integer DEFAULT false;
