import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

// ─── Users (Auth) ────────────────────────────────────────────────────────────
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

  // Property
  address: varchar("address", { length: 255 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 50 }).default("IL").notNull(),
  zip: varchar("zip", { length: 10 }).notNull(),
  targetCity: mysqlEnum("targetCity", ["naperville", "willow-springs", "sag-bridge", "palisades"]).notNull(),

  // Contact
  firstName: varchar("firstName", { length: 100 }),
  lastName: varchar("lastName", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),

  // Qualifying
  contractorSelected: mysqlEnum("contractorSelected", ["yes", "no", "unknown"]).default("unknown"),
  claimFiled: mysqlEnum("claimFiled", ["yes", "no", "unknown"]).default("unknown"),
  bestContactTime: mysqlEnum("bestContactTime", ["morning", "afternoon", "evening", "anytime"]).default("anytime"),

  // Hail verification
  addressVerified: boolean("addressVerified").default(false),
  hailSizeConfirmed: varchar("hailSizeConfirmed", { length: 20 }),
  stormConfirmationMessage: text("stormConfirmationMessage"),

  // Lead scoring & status
  leadScore: int("leadScore").default(0),
  status: mysqlEnum("status", [
    "new",
    "contacted",
    "appointment_set",
    "inspected",
    "contracted",
    "lost",
  ]).default("new").notNull(),
  nextAction: text("nextAction"),
  nextActionDue: timestamp("nextActionDue"),

  // Source tracking
  source: varchar("source", { length: 100 }).default("landing_page"),
  utmSource: varchar("utmSource", { length: 100 }),
  utmMedium: varchar("utmMedium", { length: 100 }),
  utmCampaign: varchar("utmCampaign", { length: 100 }),
  qrCodeScanned: boolean("qrCodeScanned").default(false),

  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastActivityAt: timestamp("lastActivityAt").defaultNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

// ─── Lead Notes ───────────────────────────────────────────────────────────────
export const leadNotes = mysqlTable("lead_notes", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  note: text("note").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LeadNote = typeof leadNotes.$inferSelect;
export type InsertLeadNote = typeof leadNotes.$inferInsert;
