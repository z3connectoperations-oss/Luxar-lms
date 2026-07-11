CREATE TABLE `phonepe_webhook_events` (
	`id` text PRIMARY KEY NOT NULL,
	`dedup_key` text NOT NULL,
	`event` text,
	`order_id` text,
	`merchant_order_id` text,
	`state` text,
	`received_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `phonepe_webhook_events_dedup_key_unique` ON `phonepe_webhook_events` (`dedup_key`);
