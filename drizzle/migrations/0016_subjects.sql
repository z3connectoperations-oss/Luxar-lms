CREATE TABLE `subjects` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`position` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'published' NOT NULL
);
--> statement-breakpoint
ALTER TABLE `modules` ADD `subject_id` text;
