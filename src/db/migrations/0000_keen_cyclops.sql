CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`at` text NOT NULL,
	`actor` text DEFAULT 'user' NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`action` text NOT NULL,
	`before` text,
	`after` text
);
--> statement-breakpoint
CREATE INDEX `idx_audit_log_at` ON `audit_log` (`at`);--> statement-breakpoint
CREATE TABLE `meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
