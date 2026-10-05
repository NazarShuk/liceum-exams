ALTER TABLE `users` ADD `role` text DEFAULT 'parent' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `parent_id` integer;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`userId` integer NOT NULL,
	`studentId` integer NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `fk_applications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_applications_studentId_users_id_fk` FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_applications`(`id`, `userId`, `studentId`, `created_at`) SELECT `id`, `userId`, `studentId`, `created_at` FROM `applications`;--> statement-breakpoint
DROP TABLE `applications`;--> statement-breakpoint
ALTER TABLE `__new_applications` RENAME TO `applications`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
DROP TABLE `students`;