CREATE TABLE `sites` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`status` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`ground_elevation_m` real,
	`address` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_sites_deleted_at` ON `sites` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `idx_sites_lat_lng` ON `sites` (`latitude`,`longitude`);