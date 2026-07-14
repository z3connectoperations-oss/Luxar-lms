ALTER TABLE `courses` ADD `is_package` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `courses` ADD `parent_course_id` text;
