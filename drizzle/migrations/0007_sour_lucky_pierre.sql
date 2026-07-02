CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`user_id` text NOT NULL,
	`invoice_number` text NOT NULL,
	`amount` integer NOT NULL,
	`business_details` text,
	`pdf_r2_key` text,
	`created_at` integer,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_invoice_number_unique` ON `invoices` (`invoice_number`);--> statement-breakpoint
CREATE TABLE `payment_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text,
	`merchant_transaction_id` text,
	`provider` text,
	`event` text NOT NULL,
	`request_payload` text,
	`response_payload` text,
	`status` text,
	`ip_address` text,
	`created_at` integer,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `payment_provider` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `merchant_transaction_id` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `phonepe_transaction_id` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `payment_status` text DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE `orders` ADD `payment_response_json` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `payment_completed_at` integer;--> statement-breakpoint
ALTER TABLE `orders` ADD `payment_failed_reason` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `payment_verified` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `orders` ADD `webhook_received` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `orders` ADD `refund_status` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `refund_amount` integer;--> statement-breakpoint
ALTER TABLE `orders` ADD `refund_reference` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `refund_reason` text;--> statement-breakpoint
CREATE UNIQUE INDEX `orders_merchant_transaction_id_unique` ON `orders` (`merchant_transaction_id`);