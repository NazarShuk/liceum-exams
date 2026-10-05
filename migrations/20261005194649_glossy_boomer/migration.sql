CREATE TABLE `forms` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`title` text NOT NULL,
	`description` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`schema` text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
ALTER TABLE `applications` ADD `updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD `form` integer NOT NULL REFERENCES forms(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `applications` ADD `answers` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD `state` text DEFAULT 'draft' NOT NULL;