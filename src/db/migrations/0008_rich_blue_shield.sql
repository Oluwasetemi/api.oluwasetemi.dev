PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`slug` text,
	`content` text NOT NULL,
	`excerpt` text,
	`featured_image` text,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`category` text,
	`tags` text,
	`view_count` integer DEFAULT 0 NOT NULL,
	`published_at` integer,
	`author` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`author`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_posts`("id", "title", "slug", "content", "excerpt", "featured_image", "status", "category", "tags", "view_count", "published_at", "author", "created_at", "updated_at") SELECT "id", "title", "slug", "content", "excerpt", "featured_image", "status", "category", "tags", "view_count", "published_at", "author", "created_at", "updated_at" FROM `posts`;--> statement-breakpoint
DROP TABLE `posts`;--> statement-breakpoint
ALTER TABLE `__new_posts` RENAME TO `posts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `posts_slug_unique` ON `posts` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_posts_slug` ON `posts` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_posts_author` ON `posts` (`author`);--> statement-breakpoint
CREATE INDEX `idx_posts_status` ON `posts` (`status`);--> statement-breakpoint
CREATE INDEX `idx_posts_published_at` ON `posts` (`published_at`);