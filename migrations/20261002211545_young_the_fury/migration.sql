CREATE TABLE `applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`userId` integer,
	`studentId` integer
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`firstName` text,
	`lastName` text,
	`middleName` text,
	`birthDate` integer,
	`phone` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`firstName` text,
	`lastName` text,
	`middleName` text,
	`birthDate` integer,
	`phone` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP)
);
