PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`user_id` integer NOT NULL,
	`student_id` integer,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`form_id` integer NOT NULL,
	`profile_id` integer NOT NULL,
	`campaign_id` integer,
	`answers` text DEFAULT '{}' NOT NULL,
	`state` text DEFAULT 'draft' NOT NULL,
	CONSTRAINT `fk_applications_userId_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_applications_studentId_users_id_fk` FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_applications_form_forms_id_fk` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_applications_profile_id_profiles_id_fk` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_applications_campaign_id_campaigns_id_fk` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
INSERT INTO `__new_applications`(`id`, `user_id`, `student_id`, `created_at`, `updated_at`, `form_id`, `profile_id`, `campaign_id`, `answers`, `state`) SELECT `id`, `user_id`, `student_id`, `created_at`, `updated_at`, `form_id`, `profile_id`, `campaign_id`, `answers`, `state` FROM `applications`;--> statement-breakpoint
DROP TABLE `applications`;--> statement-breakpoint
ALTER TABLE `__new_applications` RENAME TO `applications`;--> statement-breakpoint
PRAGMA foreign_keys=ON;