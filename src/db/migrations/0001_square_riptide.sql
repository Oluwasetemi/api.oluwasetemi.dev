PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`start` integer,
	`end` integer,
	`duration` integer,
	`priority` text DEFAULT 'MEDIUM' NOT NULL,
	`status` text DEFAULT 'TODO' NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`parent_id` text,
	`children` text DEFAULT '[]' NOT NULL,
	`owner` text,
	`tags` text,
	`due_date` integer,
	`completed_at` integer,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`parent_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_tasks`("id", "name", "description", "start", "end", "duration", "priority", "status", "archived", "parent_id", "children", "owner", "tags", "due_date", "completed_at", "created_at", "updated_at") SELECT "id", "name", "description", "start", "end", "duration", "priority", "status", "archived", "parent_id", "children", "owner", "tags", "due_date", "completed_at", "created_at", "updated_at" FROM `tasks`;--> statement-breakpoint
DROP TABLE `tasks`;--> statement-breakpoint
ALTER TABLE `__new_tasks` RENAME TO `tasks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;