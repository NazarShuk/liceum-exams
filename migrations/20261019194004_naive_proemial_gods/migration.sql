CREATE TABLE `applicant_invites` (
	`id` text PRIMARY KEY,
	`application_id` integer NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `fk_applicant_invites_application_id_applications_id_fk` FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`)
);
