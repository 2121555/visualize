import { eq, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  leads, InsertLead,
  leadNotes, InsertLeadNote,
  completedJobs, InsertCompletedJob,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field]; if (value === undefined) return;
      const normalized = value ?? null; values[field] = normalized; updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Leads ────────────────────────────────────────────────────────────────────
export async function createLead(data: InsertLead) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(leads).values(data);
  return result;
}

export async function getAllLeads(filters?: { city?: string; status?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.city) conditions.push(eq(leads.targetCity, filters.city as any));
  if (filters?.status) conditions.push(eq(leads.status, filters.status as any));
  const query = conditions.length > 0
    ? db.select().from(leads).where(and(...conditions)).orderBy(desc(leads.expectedReturn))
    : db.select().from(leads).orderBy(desc(leads.expectedReturn));
  return await query;
}

export async function getLeadById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateLeadStatus(id: number, status: string, nextAction?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, unknown> = { status, lastActivityAt: new Date() };
  if (nextAction) updateData.nextAction = nextAction;
  await db.update(leads).set(updateData as any).where(eq(leads.id, id));
}

export async function updateLeadScoring(id: number, data: {
  leadScore: number;
  estimatedJobValue: number;
  closeProbability: number;
  expectedReturn: number;
  scoreBreakdown: unknown;
  nextAction: string;
  nextActionDue: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(leads).set({
    leadScore: data.leadScore,
    estimatedJobValue: data.estimatedJobValue,
    closeProbability: String(data.closeProbability),
    expectedReturn: data.expectedReturn,
    scoreBreakdown: data.scoreBreakdown,
    nextAction: data.nextAction,
    nextActionDue: data.nextActionDue,
    lastActivityAt: new Date(),
  } as any).where(eq(leads.id, id));
}

export async function getLeadStats() {
  const db = await getDb();
  if (!db) return { total: 0, new: 0, contacted: 0, appointment_set: 0, inspected: 0, contracted: 0, lost: 0, totalPipelineValue: 0, avgExpectedReturn: 0 };
  const allLeads = await db.select().from(leads);
  const activeLeads = allLeads.filter(l => l.status !== "lost");
  return {
    total: allLeads.length,
    new: allLeads.filter(l => l.status === "new").length,
    contacted: allLeads.filter(l => l.status === "contacted").length,
    appointment_set: allLeads.filter(l => l.status === "appointment_set").length,
    inspected: allLeads.filter(l => l.status === "inspected").length,
    contracted: allLeads.filter(l => l.status === "contracted").length,
    lost: allLeads.filter(l => l.status === "lost").length,
    totalPipelineValue: activeLeads.reduce((sum, l) => sum + (l.estimatedJobValue || 0), 0),
    avgExpectedReturn: activeLeads.length > 0
      ? Math.round(activeLeads.reduce((sum, l) => sum + (l.expectedReturn || 0), 0) / activeLeads.length)
      : 0,
  };
}

// ─── Lead Notes ───────────────────────────────────────────────────────────────
export async function addLeadNote(data: { leadId: number; content: string; authorName?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(leadNotes).values({
    leadId: data.leadId,
    content: data.content,
    authorName: data.authorName || null,
  });
}

export async function getLeadNotes(leadId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(leadNotes).where(eq(leadNotes.leadId, leadId)).orderBy(desc(leadNotes.createdAt));
}

// ─── Social Proof (Public) ───────────────────────────────────────────────────
export async function getCityStats(targetCity?: string) {
  const db = await getDb();
  if (!db) return { inspectionsScheduled: 0, restorationComplete: 0, totalLeads: 0 };
  const conditions = targetCity ? [eq(leads.targetCity, targetCity as any)] : [];
  const allLeads = conditions.length > 0
    ? await db.select().from(leads).where(and(...conditions))
    : await db.select().from(leads);
  return {
    inspectionsScheduled: allLeads.filter(l => ["appointment_set", "inspected", "contracted"].includes(l.status)).length,
    restorationComplete: allLeads.filter(l => l.status === "contracted").length,
    totalLeads: allLeads.length,
  };
}

export async function getRecentActivity(targetCity?: string, limit = 5) {
  const db = await getDb();
  if (!db) return [];
  const conditions = targetCity ? [eq(leads.targetCity, targetCity as any)] : [];
  const allLeads = conditions.length > 0
    ? await db.select().from(leads).where(and(...conditions)).orderBy(desc(leads.createdAt)).limit(limit)
    : await db.select().from(leads).orderBy(desc(leads.createdAt)).limit(limit);
  return allLeads.map(l => {
    const streetParts = l.address.split(",")[0]?.split(" ") || [];
    const streetName = streetParts.length > 2 ? streetParts.slice(1).join(" ") : "your area";
    const timeAgo = getTimeAgo(l.createdAt);
    return {
      streetHint: streetName,
      city: l.targetCity,
      action: l.status === "contracted" ? "completed restoration" : l.status === "inspected" ? "completed inspection" : l.status === "appointment_set" ? "scheduled inspection" : "requested inspection",
      timeAgo,
    };
  });
}

// ─── Completed Jobs (Jones Collateral) ────────────────────────────────────────
export async function createCompletedJob(data: InsertCompletedJob) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(completedJobs).values(data);
}

export async function getCompletedJobs(targetCity?: string) {
  const db = await getDb();
  if (!db) return [];
  if (targetCity) {
    return await db.select().from(completedJobs)
      .where(eq(completedJobs.targetCity, targetCity as any))
      .orderBy(desc(completedJobs.completionDate));
  }
  return await db.select().from(completedJobs).orderBy(desc(completedJobs.completionDate));
}

export async function getNearbyCompletedJobs(lat: number, lng: number, radiusMiles = 1) {
  const db = await getDb();
  if (!db) return [];
  // Approximate: 1 degree lat ≈ 69 miles, 1 degree lng ≈ 54.6 miles at 41.7°N
  const latDelta = radiusMiles / 69;
  const lngDelta = radiusMiles / 54.6;
  const allJobs = await db.select().from(completedJobs);
  return allJobs.filter(j => {
    if (!j.lat || !j.lng) return false;
    const jLat = Number(j.lat);
    const jLng = Number(j.lng);
    return Math.abs(jLat - lat) <= latDelta && Math.abs(jLng - lng) <= lngDelta;
  });
}

export async function getCompletedJobById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(completedJobs).where(eq(completedJobs.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
