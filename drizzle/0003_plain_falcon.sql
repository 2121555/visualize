CREATE TABLE `drip_sequences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`step` enum('confirmation','24h','3d','7d') NOT NULL,
	`scheduledFor` timestamp NOT NULL,
	`sent` boolean NOT NULL DEFAULT false,
	`sentAt` timestamp,
	`cancelled` boolean NOT NULL DEFAULT false,
	`scheduleCronTaskUid` varchar(65),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `drip_sequences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientType` enum('owner','homeowner') NOT NULL,
	`recipientEmail` varchar(320),
	`leadId` int,
	`type` enum('new_lead','high_value_lead','qr_scan','deadline_escalation','daily_briefing','neighbor_trigger','inspection_followup','milestone','homeowner_confirmation','homeowner_drip_24h','homeowner_drip_3d','homeowner_drip_7d','status_change') NOT NULL,
	`title` varchar(500) NOT NULL,
	`content` text NOT NULL,
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`channel` enum('in_app','push','email','owner_notify') NOT NULL DEFAULT 'in_app',
	`delivered` boolean NOT NULL DEFAULT false,
	`deliveredAt` timestamp,
	`read` boolean NOT NULL DEFAULT false,
	`readAt` timestamp,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
