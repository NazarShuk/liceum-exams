PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_applicant_invites` (
	`id` text PRIMARY KEY,
	`application_id` integer NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `fk_applicant_invites_application_id_applications_id_fk` FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_applicant_invites`(`id`, `application_id`, `created_at`) SELECT `id`, `application_id`, `created_at` FROM `applicant_invites`;--> statement-breakpoint
DROP TABLE `applicant_invites`;--> statement-breakpoint
ALTER TABLE `__new_applicant_invites` RENAME TO `applicant_invites`;--> statement-breakpoint
PRAGMA foreign_keys=ON;