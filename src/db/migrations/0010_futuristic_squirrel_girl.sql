CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`content` text NOT NULL,
	`author_name` text NOT NULL,
	`author_email` text,
	`author_id` text,
	`is_edited` integer DEFAULT false NOT NULL,
	`edited_at` integer,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_comments_post_id` ON `comments` (`post_id`);--> statement-breakpoint
CREATE INDEX `idx_comments_author_id` ON `comments` (`author_id`);--> statement-breakpoint
CREATE INDEX `idx_comments_created_at` ON `comments` (`created_at`);