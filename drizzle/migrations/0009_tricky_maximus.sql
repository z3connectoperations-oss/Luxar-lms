CREATE TABLE `test_series` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`description_md` text,
	`thumbnail_r2_key` text,
	`banner_r2_key` text,
	`price` integer DEFAULT 0 NOT NULL,
	`discount_price` integer,
	`validity_days` integer DEFAULT 365 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`position` integer DEFAULT 0,
	`is_featured` integer DEFAULT false,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `test_series_slug_unique` ON `test_series` (`slug`);--> statement-breakpoint
CREATE TABLE `test_series_attempt_answers` (
	`id` text PRIMARY KEY NOT NULL,
	`attempt_id` text NOT NULL,
	`question_id` text NOT NULL,
	`selected_option` text,
	`is_correct` integer,
	FOREIGN KEY (`attempt_id`) REFERENCES `test_series_attempts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`question_id`) REFERENCES `test_series_questions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `test_series_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`test_id` text NOT NULL,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`created_at` integer,
	`submitted_at` integer,
	`score` integer DEFAULT 0,
	`correct_count` integer DEFAULT 0,
	`wrong_count` integer DEFAULT 0,
	`skipped_count` integer DEFAULT 0,
	`time_taken_sec` integer DEFAULT 0,
	`faculty_feedback_md` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`test_id`) REFERENCES `test_series_tests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `test_series_enrollments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`test_series_id` text NOT NULL,
	`created_at` integer,
	`expiry_date` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`test_series_id`) REFERENCES `test_series`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `test_series_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`test_id` text NOT NULL,
	`prompt` text NOT NULL,
	`option_a` text NOT NULL,
	`option_b` text NOT NULL,
	`option_c` text NOT NULL,
	`option_d` text NOT NULL,
	`correct_answer` text NOT NULL,
	`explanation` text,
	`marks` integer DEFAULT 1 NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`test_id`) REFERENCES `test_series_tests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `test_series_tests` (
	`id` text PRIMARY KEY NOT NULL,
	`test_series_id` text NOT NULL,
	`title` text NOT NULL,
	`duration_min` integer DEFAULT 60 NOT NULL,
	`passing_marks` integer DEFAULT 40 NOT NULL,
	`passing_pct` integer DEFAULT 40 NOT NULL,
	`max_attempts` integer DEFAULT 3 NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	FOREIGN KEY (`test_series_id`) REFERENCES `test_series`(`id`) ON UPDATE no action ON DELETE no action
);
