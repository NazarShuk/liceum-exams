ALTER TABLE `applications` ADD `status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD `notes` text DEFAULT '' NOT NULL;