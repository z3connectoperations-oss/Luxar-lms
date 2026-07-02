CREATE TABLE `mock_attempt_answers` (
	`id` text PRIMARY KEY NOT NULL,
	`attempt_id` text NOT NULL,
	`question_id` text NOT NULL,
	`selected_option` text,
	`is_correct` integer,
	FOREIGN KEY (`attempt_id`) REFERENCES `mock_attempts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`question_id`) REFERENCES `mock_questions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `mock_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`mock_test_id` text NOT NULL,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`created_at` integer,
	`submitted_at` integer,
	`score` integer DEFAULT 0,
	`correct_count` integer DEFAULT 0,
	`wrong_count` integer DEFAULT 0,
	`skipped_count` integer DEFAULT 0,
	`time_taken_sec` integer DEFAULT 0,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`mock_test_id`) REFERENCES `mock_tests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `mock_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`mock_test_id` text NOT NULL,
	`prompt` text NOT NULL,
	`option_a` text NOT NULL,
	`option_b` text NOT NULL,
	`option_c` text NOT NULL,
	`option_d` text NOT NULL,
	`correct_answer` text NOT NULL,
	`explanation` text,
	`marks` integer DEFAULT 1 NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`mock_test_id`) REFERENCES `mock_tests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `mock_tests` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`module_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`duration_min` integer DEFAULT 60 NOT NULL,
	`passing_marks` integer DEFAULT 40 NOT NULL,
	`passing_pct` integer DEFAULT 40 NOT NULL,
	`max_attempts` integer DEFAULT 3 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`module_id`) REFERENCES `modules`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mock_tests_module_id_unique` ON `mock_tests` (`module_id`);