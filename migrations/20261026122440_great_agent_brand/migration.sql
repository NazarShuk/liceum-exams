PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_news` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`title` text NOT NULL,
	`tag` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_news`(`id`, `title`, `tag`, `content`, `created_at`) SELECT `id`, `title`, `tag`, `content`, `created_at` FROM `news`;--> statement-breakpoint
DROP TABLE `news`;--> statement-breakpoint
ALTER TABLE `__new_news` RENAME TO `news`;--> statement-breakpoint
PRAGMA foreign_keys=ON;