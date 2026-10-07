CREATE TABLE `campaigns_to_profiles` (
	`campaign_id` integer NOT NULL,
	`profile_id` integer NOT NULL,
	CONSTRAINT `campaigns_to_profiles_pk` PRIMARY KEY(`campaign_id`, `profile_id`),
	CONSTRAINT `fk_campaigns_to_profiles_campaign_id_campaigns_id_fk` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_campaigns_to_profiles_profile_id_profiles_id_fk` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`title` text NOT NULL,
	`description` text,
	`formId` integer,
	CONSTRAINT `fk_profiles_formId_forms_id_fk` FOREIGN KEY (`formId`) REFERENCES `forms`(`id`)
);
--> statement-breakpoint
INSERT INTO `__new_profiles`(`id`, `title`, `description`, `formId`) SELECT `id`, `title`, `description`, `formId` FROM `profiles`;--> statement-breakpoint
DROP TABLE `profiles`;--> statement-breakpoint
ALTER TABLE `__new_profiles` RENAME TO `profiles`;--> statement-breakpoint
PRAGMA foreign_keys=ON;