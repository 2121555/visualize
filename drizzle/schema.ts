import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  decimal,
  json,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Leads ────────────────────────────────────────────────────────────────────
export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),

  // Address
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 2 }).default("IL").notNull(),
  zip: varchar("zip", { length: 10 }).notNull(),
  targetCity: mysqlEnum("targetCity", [
    "naperville",
    "willow-springs",
    "sag-bridge",
    "palisades",
  ]).notNull(),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),

  // Contact
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),

  // Qualifying
  contractorSelected: mysqlEnum("contractorSelected", ["yes", "no", "unknown"])
    .default("unknown")
    .notNull(),
  claimFiled: mysqlEnum("claimFiled", ["yes", "no", "unknown"])
    .default("unknown")
    .notNull(),
  bestContactTime: mysqlEnum("bestContactTime", [
    "morning",
    "afternoon",
    "evening",
    "anytime",
  ])
    .default("anytime")
    .notNull(),

  // Storm verification
  addressVerified: boolean("addressVerified").default(false).notNull(),
  hailSizeConfirmed: varchar("hailSizeConfirmed", { length: 30 }),
  stormConfirmationMsg: text("stormConfirmationMsg"),

  // Source
  source: mysqlEnum("source", [
    "landing_page",
    "qr_code",
    "direct",
    "referral",
  ])
    .default("landing_page")
    .notNull(),
  qrCodeScanned: boolean("qrCodeScanned").default(false).notNull(),

  // Pipeline
  status: mysqlEnum("status", [
    "new",
    "contacted",
    "appointment_set",
    "inspected",
    "contracted",
    "lost",
  ])
    .default("new")
    .notNull(),

  // ROI Scoring
  leadScore: int("leadScore").default(0).notNull(),
  estimatedJobValue: int("estimatedJobValue").default(0),
  closeProbability: decimal("closeProbability", { precision: 5, scale: 2 }).default("0"),
  expectedReturn: int("expectedReturn").default(0),
  scoreBreakdown: json("scoreBreakdown"),

  // Next Action Engine
  nextAction: text("nextAction"),
  nextActionDue: timestamp("nextActionDue"),

  // Timestamps
  lastActivityAt: timestamp("lastActivityAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

// ─── Lead Notes ───────────────────────────────────────────────────────────────
export const leadNotes = mysqlTable("lead_notes", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  content: text("content").notNull(),
  authorName: varchar("authorName", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LeadNote = typeof leadNotes.$inferSelect;
export type InsertLeadNote = typeof leadNotes.$inferInsert;

// ─── Completed Jobs (Jones Collateral) ────────────────────────────────────────
export const completedJobs = mysqlTable("completed_jobs", {
  id: int("id").autoincrement().primaryKey(),

  // Location
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  targetCity: mysqlEnum("targetCity_cj", [
    "naperville",
    "willow-springs",
    "sag-bridge",
    "palisades",
  ]).notNull(),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),

  // Job details
  jobType: varchar("jobType", { length: 100 }).default("Roof Replacement"),
  estimatedValue: int("estimatedValue"),
  completionDate: timestamp("completionDate"),

  // Photos (stored as S3 URLs in JSON array)
  beforePhotos: json("beforePhotos").$type<string[]>(),
  afterPhotos: json("afterPhotos").$type<string[]>(),

  // Permission
  permissionLevel: mysqlEnum("permissionLevel", [
    "full",        // Can show address + photos
    "anonymous",   // Can show street name + photos
    "count_only",  // Only counted in stats
  ])
    .default("anonymous")
    .notNull(),

  // Metadata
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CompletedJob = typeof completedJobs.$inferSelect;
export type InsertCompletedJob = typeof completedJobs.$inferInsert;
