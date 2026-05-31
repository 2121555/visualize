CREATE TABLE `completed_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`address` text NOT NULL,
	`city` varchar(100) NOT NULL,
	`targetCity_cj` enum('naperville','willow-springs','sag-bridge','palisades') NOT NULL,
	`lat` decimal(10,7),
	`lng` decimal(10,7),
	`jobType` varchar(100) DEFAULT 'Roof Replacement',
	`estimatedValue` int,
	`completionDate` timestamp,
	`beforePhotos` json,
	`afterPhotos` json,
	`permissionLevel` enum('full','anonymous','count_only') NOT NULL DEFAULT 'anonymous',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `completed_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `leads` RENAME COLUMN `stormConfirmationMessage` TO `stormConfirmationMsg`;--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `address` text NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `state` varchar(2) NOT NULL DEFAULT 'IL';--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `firstName` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `lastName` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `phone` varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `email` varchar(320) NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `contractorSelected` enum('yes','no','unknown') NOT NULL DEFAULT 'unknown';--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `claimFiled` enum('yes','no','unknown') NOT NULL DEFAULT 'unknown';--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `bestContactTime` enum('morning','afternoon','evening','anytime') NOT NULL DEFAULT 'anytime';--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `addressVerified` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `hailSizeConfirmed` varchar(30);--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `leadScore` int NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `source` enum('landing_page','qr_code','direct','referral') NOT NULL DEFAULT 'landing_page';--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `qrCodeScanned` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `lead_notes` ADD `content` text NOT NULL;--> statement-breakpoint
ALTER TABLE `lead_notes` ADD `authorName` varchar(100);--> statement-breakpoint
ALTER TABLE `leads` ADD `lat` decimal(10,7);--> statement-breakpoint
ALTER TABLE `leads` ADD `lng` decimal(10,7);--> statement-breakpoint
ALTER TABLE `leads` ADD `estimatedJobValue` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `leads` ADD `closeProbability` decimal(5,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `leads` ADD `expectedReturn` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `leads` ADD `scoreBreakdown` json;--> statement-breakpoint
ALTER TABLE `lead_notes` DROP COLUMN `note`;--> statement-breakpoint
ALTER TABLE `leads` DROP COLUMN `utmSource`;--> statement-breakpoint
ALTER TABLE `leads` DROP COLUMN `utmMedium`;--> statement-breakpoint
ALTER TABLE `leads` DROP COLUMN `utmCampaign`;