CREATE TABLE `campaigns` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`title` text NOT NULL,
	`begins_at` integer,
	`ends_at` integer
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`title` text NOT NULL,
	`description` text,
	`campaignId` integer,
	`formId` integer,
	CONSTRAINT `fk_profiles_campaignId_campaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_profiles_formId_forms_id_fk` FOREIGN KEY (`formId`) REFERENCES `forms`(`id`)
);
