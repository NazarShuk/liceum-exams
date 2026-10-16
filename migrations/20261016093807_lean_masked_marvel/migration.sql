PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`external_id` text,
	`firstName` text NOT NULL,
	`lastName` text NOT NULL,
	`middleName` text,
	`birthDate` integer,
	`phone` text,
	`data` text,
	`role` text DEFAULT 'parent' NOT NULL,
	`parent_id` integer,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
INSERT INTO `__new_users`(`id`, `external_id`, `firstName`, `lastName`, `middleName`, `birthDate`, `phone`, `data`, `role`, `parent_id`, `created_at`) SELECT `id`, `external_id`, `firstName`, `lastName`, `middleName`, `birthDate`, `phone`, `data`, `role`, `parent_id`, `created_at` FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;