CREATE TABLE `lead_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`note` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lead_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`address` varchar(255) NOT NULL,
	`city` varchar(100) NOT NULL,
	`state` varchar(50) NOT NULL DEFAULT 'IL',
	`zip` varchar(10) NOT NULL,
	`targetCity` enum('naperville','willow-springs','sag-bridge','palisades') NOT NULL,
	`firstName` varchar(100),
	`lastName` varchar(100),
	`phone` varchar(20),
	`email` varchar(320),
	`contractorSelected` enum('yes','no','unknown') DEFAULT 'unknown',
	`claimFiled` enum('yes','no','unknown') DEFAULT 'unknown',
	`bestContactTime` enum('morning','afternoon','evening','anytime') DEFAULT 'anytime',
	`addressVerified` boolean DEFAULT false,
	`hailSizeConfirmed` varchar(20),
	`stormConfirmationMessage` text,
	`leadScore` int DEFAULT 0,
	`status` enum('new','contacted','appointment_set','inspected','contracted','lost') NOT NULL DEFAULT 'new',
	`nextAction` text,
	`nextActionDue` timestamp,
	`source` varchar(100) DEFAULT 'landing_page',
	`utmSource` varchar(100),
	`utmMedium` varchar(100),
	`utmCampaign` varchar(100),
	`qrCodeScanned` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastActivityAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
