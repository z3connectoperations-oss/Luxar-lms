ALTER TABLE `courses` ADD `mock_opens_before_end_days` integer DEFAULT 30;--> statement-breakpoint
ALTER TABLE `courses` ADD `mock_window_days` integer DEFAULT 7;--> statement-breakpoint
ALTER TABLE `courses` ADD `final_opens_before_end_days` integer DEFAULT 15;--> statement-breakpoint
ALTER TABLE `courses` ADD `final_window_days` integer DEFAULT 7;