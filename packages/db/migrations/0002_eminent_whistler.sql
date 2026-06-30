CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`thumbnail_r2_key` text,
	`status` text DEFAULT 'published' NOT NULL,
	`position` integer DEFAULT 0,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
ALTER TABLE `courses` ADD `category_id` text REFERENCES categories(id);--> statement-breakpoint
ALTER TABLE `courses` ADD `trainer_id` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `courses` ADD `banner_r2_key` text;--> statement-breakpoint
ALTER TABLE `courses` ADD `intro_video` text;--> statement-breakpoint
ALTER TABLE `courses` ADD `level` text;--> statement-breakpoint
ALTER TABLE `courses` ADD `tags` text;--> statement-breakpoint
ALTER TABLE `courses` ADD `duration_days` integer DEFAULT 365;--> statement-breakpoint
ALTER TABLE `courses` ADD `price` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `courses` ADD `discount_price` integer;--> statement-breakpoint
ALTER TABLE `courses` ADD `enrollment_limit` integer;--> statement-breakpoint
ALTER TABLE `courses` ADD `downloadable_enabled` integer DEFAULT true;--> statement-breakpoint
ALTER TABLE `courses` ADD `live_classes_enabled` integer DEFAULT true;--> statement-breakpoint
ALTER TABLE `lessons` ADD `description` text;