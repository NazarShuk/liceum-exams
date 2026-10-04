PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_students` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`firstName` text NOT NULL,
	`lastName` text NOT NULL,
	`middleName` text NOT NULL,
	`birthDate` integer NOT NULL,
	`phone` text NOT NULL,
	`data` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
INSERT INTO `__new_students`(`id`, `firstName`, `lastName`, `middleName`, `birthDate`, `phone`, `data`, `created_at`) SELECT `id`, `firstName`, `lastName`, `middleName`, `birthDate`, `phone`, `data`, `created_at` FROM `students`;--> statement-breakpoint
DROP TABLE `students`;--> statement-breakpoint
ALTER TABLE `__new_students` RENAME TO `students`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`firstName` text NOT NULL,
	`lastName` text NOT NULL,
	`middleName` text,
	`birthDate` integer,
	`phone` text,
	`data` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
INSERT INTO `__new_users`(`id`, `firstName`, `lastName`, `middleName`, `birthDate`, `phone`, `data`, `created_at`) SELECT `id`, `firstName`, `lastName`, `middleName`, `birthDate`, `phone`, `data`, `created_at` FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;