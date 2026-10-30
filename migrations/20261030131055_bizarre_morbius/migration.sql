CREATE TABLE `groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`title` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE TABLE `groups_to_applications` (
	`group_id` integer NOT NULL,
	`application_id` integer NOT NULL,
	CONSTRAINT `groups_to_applications_pk` PRIMARY KEY(`group_id`, `application_id`),
	CONSTRAINT `fk_groups_to_applications_group_id_groups_id_fk` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_groups_to_applications_application_id_applications_id_fk` FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `groups_to_teachers` (
	`group_id` integer NOT NULL,
	`teacher_id` integer NOT NULL,
	CONSTRAINT `groups_to_teachers_pk` PRIMARY KEY(`group_id`, `teacher_id`),
	CONSTRAINT `fk_groups_to_teachers_group_id_groups_id_fk` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_groups_to_teachers_teacher_id_users_id_fk` FOREIGN KEY (`teacher_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
