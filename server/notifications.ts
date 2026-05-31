/**
 * Notification Engine — Handles all 10 notification types for Visualize.
 *
 * 1. Owner alerts (enhanced with ROI data)
 * 2. Push notifications (via owner notify for now, upgradeable to web push)
 * 3. In-app notifications (stored in DB, served via tRPC)
 * 4. Homeowner confirmation (immediate after form submit)
 * 5. Deadline escalation (90/60/30/7 days for unconverted leads)
 * 6. Daily briefing (morning summary)
 * 7. Neighbor trigger (same street/subdivision detection)
 * 8. Inspection follow-up (48h after inspection without advancement)
 * 9. Social proof milestones (10/25/50 completions)
 * 10. Homeowner drip sequence (immediate → 24h → 3d → 7d)
 */

import { eq, and, lt, gt, sql, desc, isNull, ne } from "drizzle-orm";
import { getDb } from "./db";
import { notifications, leads, dripSequences, completedJobs } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";
import type { InsertNotification } from "../drizzle/schema";
import { CITY_STORM_DATA, type CitySlug } from "../shared/stormData";

// ─── Core: Create & Store Notification ────────────────────────────────────────

export async function createNotification(data: Omit<InsertNotification, "id" | "createdAt">): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(notifications).values(data);
  return result[0]?.insertId ?? null;
}

// ─── 1. Enhanced Owner Alert ──────────────────────────────────────────────────

export async function sendNewLeadOwnerAlert(lead: {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  zip: string;
  phone: string;
  email: string;
  targetCity: string;
  claimFiled: string;
  contractorSelected: string;
  estimatedJobValue: number;
  expectedReturn: number;
  leadScore: number;
  nextAction: string;
  source: string;
  qrCodeScanned: boolean;
  id?: number;
}): Promise<void> {
  const tierLabel = lead.expectedReturn >= 200 ? "🔥 HIGH RETURN" :
    lead.expectedReturn >= 80 ? "⚡ MODERATE" : "📋 DEVELOPING";

  const title = `${tierLabel} — ${lead.firstName} ${lead.lastName} ($${lead.expectedReturn}/hr)`;
  const content = [
    `📍 ${lead.address}, ${lead.city} ${lead.zip}`,
    `📞 ${lead.phone} | ✉️ ${lead.email}`,
    ``,
    `💰 Est. Job Value: $${lead.estimatedJobValue.toLocaleString()}`,
    `📊 Expected Return: $${lead.expectedReturn}/hr`,
    `🎯 Score: ${lead.leadScore}/100`,
    ``,
    `📋 Claim Filed: ${lead.claimFiled} | Contractor: ${lead.contractorSelected}`,
    `🔗 Source: ${lead.source}${lead.qrCodeScanned ? " (QR Scanned)" : ""}`,
    ``,
    `▶️ NEXT ACTION: ${lead.nextAction}`,
  ].join("\n");

  // Send via Manus notification service
  await notifyOwner({ title, content });

  // Also store in-app
  await createNotification({
    recipientType: "owner",
    recipientEmail: "jc@modernplumb.com",
    leadId: lead.id || null,
    type: lead.expectedReturn >= 200 ? "high_value_lead" : "new_lead",
    title,
    content,
    priority: lead.expectedReturn >= 200 ? "urgent" : lead.expectedReturn >= 80 ? "high" : "medium",
    channel: "owner_notify",
    delivered: true,
    deliveredAt: new Date(),
    read: false,
    metadata: {
      estimatedJobValue: lead.estimatedJobValue,
      expectedReturn: lead.expectedReturn,
      leadScore: lead.leadScore,
      targetCity: lead.targetCity,
    },
  });
}

// ─── 2. QR Code Scan Alert ────────────────────────────────────────────────────

export async function sendQRScanAlert(lead: {
  firstName: string;
  lastName: string;
  address: string;
  targetCity: string;
  expectedReturn: number;
  id?: number;
}): Promise<void> {
  const title = `🔲 QR Scan: ${lead.firstName} ${lead.lastName} — ${lead.targetCity}`;
  const content = `A homeowner scanned your QR code and submitted their info.\n📍 ${lead.address}\n💰 Expected Return: $${lead.expectedReturn}/hr\n\nThis is a HIGH INTENT signal — they physically engaged with your material.`;

  await notifyOwner({ title, content });
  await createNotification({
    recipientType: "owner",
    leadId: lead.id || null,
    type: "qr_scan",
    title,
    content,
    priority: "high",
    channel: "owner_notify",
    delivered: true,
    deliveredAt: new Date(),
    read: false,
    metadata: { targetCity: lead.targetCity },
  });
}

// ─── 3. Neighbor Trigger ──────────────────────────────────────────────────────

export async function checkAndSendNeighborTrigger(lead: {
  address: string;
  targetCity: string;
  firstName: string;
  lastName: string;
  id?: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Find leads on the same street (extract street name from address)
  const streetParts = lead.address.split(" ");
  const streetName = streetParts.length >= 3
    ? streetParts.slice(1).join(" ").replace(/,.*$/, "").trim()
    : lead.address;

  const existingLeads = await db.select()
    .from(leads)
    .where(
      and(
        sql`${leads.address} LIKE ${`%${streetName}%`}`,
        eq(leads.targetCity, lead.targetCity as any),
        lead.id ? ne(leads.id, lead.id) : undefined,
      )
    )
    .limit(10);

  if (existingLeads.length > 0) {
    const title = `🏘️ Neighbor Cluster: ${existingLeads.length + 1} leads on ${streetName}`;
    const content = [
      `New lead ${lead.firstName} ${lead.lastName} at ${lead.address}`,
      `You now have ${existingLeads.length + 1} leads in this area.`,
      ``,
      `Existing leads on this street:`,
      ...existingLeads.map(l => `  • ${l.firstName} ${l.lastName} — ${l.status}`),
      ``,
      `💡 ROUTE TOGETHER: Schedule these inspections back-to-back for maximum efficiency.`,
    ].join("\n");

    await notifyOwner({ title, content });
    await createNotification({
      recipientType: "owner",
      leadId: lead.id || null,
      type: "neighbor_trigger",
      title,
      content,
      priority: "high",
      channel: "owner_notify",
      delivered: true,
      deliveredAt: new Date(),
      read: false,
      metadata: { streetName, clusterSize: existingLeads.length + 1, targetCity: lead.targetCity },
    });
  }
}

// ─── 4. Homeowner Confirmation ────────────────────────────────────────────────

export async function sendHomeownerConfirmation(lead: {
  firstName: string;
  email: string;
  address: string;
  targetCity: string;
  stormConfirmationMsg: string | null;
  id?: number;
}): Promise<void> {
  const cityData = CITY_STORM_DATA[lead.targetCity as CitySlug];
  const cityName = cityData?.name || lead.targetCity;

  const title = `Your Free Storm Damage Inspection — Confirmed`;
  const content = [
    `Hi ${lead.firstName},`,
    ``,
    `Thank you for taking the first step to protect your home. Here's what happens next:`,
    ``,
    `✅ YOUR PROPERTY: ${lead.address}`,
    `🌧️ STORM EVENT: March 10, 2026 — ${cityName}`,
    lead.stormConfirmationMsg ? `📊 ${lead.stormConfirmationMsg}` : "",
    ``,
    `📋 NEXT STEPS:`,
    `1. A local restoration specialist will contact you within 24 hours`,
    `2. We'll schedule your FREE roof inspection at your convenience`,
    `3. We'll document any damage and help you understand your options`,
    ``,
    `⏰ IMPORTANT: Your insurance claim deadline is March 10, 2027.`,
    `Most damage is invisible from the ground — a professional inspection`,
    `ensures you don't miss your window.`,
    ``,
    `Questions? Reply to this message anytime.`,
    ``,
    `— Jones Restoration`,
    `Illinois Licensed | NWS Verified Storm Data`,
  ].filter(Boolean).join("\n");

  await createNotification({
    recipientType: "homeowner",
    recipientEmail: lead.email,
    leadId: lead.id || null,
    type: "homeowner_confirmation",
    title,
    content,
    priority: "medium",
    channel: "email",
    delivered: false,
    read: false,
    metadata: { targetCity: lead.targetCity, step: "confirmation" },
  });
}

// ─── 10. Drip Sequence Initialization ─────────────────────────────────────────

export async function initializeDripSequence(leadId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const now = new Date();

  // Schedule: 24h, 3d, 7d from now
  const steps: Array<{ step: "24h" | "3d" | "7d"; offsetMs: number }> = [
    { step: "24h", offsetMs: 24 * 60 * 60 * 1000 },
    { step: "3d", offsetMs: 3 * 24 * 60 * 60 * 1000 },
    { step: "7d", offsetMs: 7 * 24 * 60 * 60 * 1000 },
  ];

  for (const { step, offsetMs } of steps) {
    const scheduledFor = new Date(now.getTime() + offsetMs);
    await db.insert(dripSequences).values({
      leadId,
      step,
      scheduledFor,
      sent: false,
      cancelled: false,
    });
  }
}

// ─── 5. Deadline Escalation Check ─────────────────────────────────────────────

export async function checkDeadlineEscalations(): Promise<{ processed: number }> {
  const db = await getDb();
  if (!db) return { processed: 0 };

  const deadline = new Date("2027-03-10T00:00:00Z");
  const now = new Date();
  const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Only fire at 90, 60, 30, 7 day marks (within a 1-day window)
  const escalationDays = [90, 60, 30, 7];
  const activeEscalation = escalationDays.find(d => Math.abs(daysRemaining - d) < 1);

  if (!activeEscalation) return { processed: 0 };

  // Find unconverted leads
  const unconvertedLeads = await db.select()
    .from(leads)
    .where(
      and(
        ne(leads.status, "contracted"),
        ne(leads.status, "lost"),
      )
    );

  if (unconvertedLeads.length === 0) return { processed: 0 };

  const urgencyMap: Record<number, string> = {
    90: "3 months",
    60: "2 months",
    30: "30 days",
    7: "7 DAYS",
  };

  const title = `⏰ DEADLINE ALERT: ${urgencyMap[activeEscalation]} remaining — ${unconvertedLeads.length} leads unconverted`;
  const content = [
    `Insurance claim deadline: March 10, 2027`,
    `Time remaining: ${daysRemaining} days (${urgencyMap[activeEscalation]})`,
    ``,
    `${unconvertedLeads.length} leads have NOT moved to "contracted":`,
    ``,
    ...unconvertedLeads.slice(0, 10).map(l =>
      `  • ${l.firstName} ${l.lastName} (${l.targetCity}) — Status: ${l.status} — $${l.expectedReturn}/hr`
    ),
    unconvertedLeads.length > 10 ? `  ... and ${unconvertedLeads.length - 10} more` : "",
    ``,
    `💡 ACTION: Prioritize re-engagement calls today. Lead with deadline urgency.`,
  ].filter(Boolean).join("\n");

  await notifyOwner({ title, content });
  await createNotification({
    recipientType: "owner",
    type: "deadline_escalation",
    title,
    content,
    priority: activeEscalation <= 7 ? "urgent" : activeEscalation <= 30 ? "high" : "medium",
    channel: "owner_notify",
    delivered: true,
    deliveredAt: new Date(),
    read: false,
    metadata: { daysRemaining, unconvertedCount: unconvertedLeads.length },
  });

  return { processed: unconvertedLeads.length };
}

// ─── 6. Daily Briefing ────────────────────────────────────────────────────────

export async function generateDailyBriefing(): Promise<{ sent: boolean }> {
  const db = await getDb();
  if (!db) return { sent: false };

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const deadline = new Date("2027-03-10T00:00:00Z");
  const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // New leads in last 24h
  const newLeads = await db.select().from(leads)
    .where(gt(leads.createdAt, yesterday));

  // All active leads sorted by expected return
  const activeLeads = await db.select().from(leads)
    .where(and(ne(leads.status, "contracted"), ne(leads.status, "lost")))
    .orderBy(desc(leads.expectedReturn))
    .limit(20);

  // Stale leads (no activity in 48h, not contracted/lost)
  const staleThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const staleLeads = await db.select().from(leads)
    .where(and(
      ne(leads.status, "contracted"),
      ne(leads.status, "lost"),
      lt(leads.lastActivityAt, staleThreshold),
    ));

  // Pipeline value
  const totalPipeline = activeLeads.reduce((sum, l) => sum + (l.estimatedJobValue || 0), 0);
  const avgReturn = activeLeads.length > 0
    ? Math.round(activeLeads.reduce((sum, l) => sum + (l.expectedReturn || 0), 0) / activeLeads.length)
    : 0;

  // Top 3 actions
  const top3 = activeLeads.slice(0, 3);

  const title = `☀️ Daily Briefing — ${now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`;
  const content = [
    `═══════════════════════════════════════`,
    `  VISUALIZE COMMAND — DAILY BRIEFING`,
    `═══════════════════════════════════════`,
    ``,
    `📅 Claim Deadline: ${daysRemaining} days remaining`,
    `💰 Pipeline Value: $${totalPipeline.toLocaleString()}`,
    `📊 Avg Return/Hr: $${avgReturn}`,
    `📥 New Leads (24h): ${newLeads.length}`,
    `⚠️ Stale Leads: ${staleLeads.length}`,
    ``,
    `━━━ TOP 3 HIGHEST-RETURN ACTIONS ━━━`,
    ``,
    ...top3.map((l, i) => [
      `${i + 1}. ${l.firstName} ${l.lastName} — $${l.expectedReturn}/hr`,
      `   📍 ${l.address}, ${l.city}`,
      `   ▶️ ${l.nextAction || "Contact lead"}`,
      ``,
    ].join("\n")),
    staleLeads.length > 0 ? [
      `━━━ STALE LEADS (48h+ no activity) ━━━`,
      ``,
      ...staleLeads.slice(0, 5).map(l =>
        `  ⚠️ ${l.firstName} ${l.lastName} (${l.status}) — last activity ${Math.round((now.getTime() - new Date(l.lastActivityAt).getTime()) / (1000 * 60 * 60))}h ago`
      ),
      ``,
    ].join("\n") : "",
    newLeads.length > 0 ? [
      `━━━ NEW LEADS OVERNIGHT ━━━`,
      ``,
      ...newLeads.map(l =>
        `  📥 ${l.firstName} ${l.lastName} (${l.targetCity}) — $${l.expectedReturn}/hr`
      ),
    ].join("\n") : "",
  ].filter(Boolean).join("\n");

  await notifyOwner({ title, content });
  await createNotification({
    recipientType: "owner",
    type: "daily_briefing",
    title,
    content,
    priority: staleLeads.length > 3 ? "high" : "medium",
    channel: "owner_notify",
    delivered: true,
    deliveredAt: new Date(),
    read: false,
    metadata: {
      newLeadsCount: newLeads.length,
      staleLeadsCount: staleLeads.length,
      pipelineValue: totalPipeline,
      daysRemaining,
    },
  });

  return { sent: true };
}

// ─── 8. Inspection Follow-up Check ────────────────────────────────────────────

export async function checkInspectionFollowups(): Promise<{ processed: number }> {
  const db = await getDb();
  if (!db) return { processed: 0 };

  const now = new Date();
  const threshold48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  // Find leads that moved to "inspected" more than 48h ago but haven't advanced
  const stuckLeads = await db.select().from(leads)
    .where(and(
      eq(leads.status, "inspected"),
      lt(leads.lastActivityAt, threshold48h),
    ));

  let processed = 0;

  for (const lead of stuckLeads) {
    // Check if we already sent a followup for this lead in the last 48h
    const existingNotif = await db.select().from(notifications)
      .where(and(
        eq(notifications.leadId, lead.id),
        eq(notifications.type, "inspection_followup"),
        gt(notifications.createdAt, threshold48h),
      ))
      .limit(1);

    if (existingNotif.length > 0) continue;

    const title = `🔔 Follow-up Needed: ${lead.firstName} ${lead.lastName} — 48h since inspection`;
    const content = [
      `Lead inspected but hasn't advanced to "contracted" in 48 hours.`,
      ``,
      `📍 ${lead.address}, ${lead.city}`,
      `💰 Est. Job: $${(lead.estimatedJobValue || 0).toLocaleString()}`,
      `📊 Expected Return: $${lead.expectedReturn}/hr`,
      ``,
      `💡 SUGGESTED ACTION: Call ${lead.firstName} to discuss inspection findings.`,
      `Ask: "Did you have any questions about what we found on your roof?"`,
      `Lead with: "Your insurance deadline is approaching — I want to make sure you're covered."`,
    ].join("\n");

    await notifyOwner({ title, content });
    await createNotification({
      recipientType: "owner",
      leadId: lead.id,
      type: "inspection_followup",
      title,
      content,
      priority: "high",
      channel: "owner_notify",
      delivered: true,
      deliveredAt: new Date(),
      read: false,
      metadata: { hoursSinceInspection: Math.round((now.getTime() - new Date(lead.lastActivityAt).getTime()) / (1000 * 60 * 60)) },
    });

    processed++;
  }

  return { processed };
}

// ─── 9. Social Proof Milestones ───────────────────────────────────────────────

export async function checkMilestones(): Promise<{ triggered: string[] }> {
  const db = await getDb();
  if (!db) return { triggered: [] };

  const triggered: string[] = [];
  const milestones = [10, 25, 50, 75, 100];
  const cities: CitySlug[] = ["naperville", "willow-springs", "sag-bridge", "palisades"];

  for (const city of cities) {
    const jobs = await db.select({ count: sql<number>`count(*)` })
      .from(completedJobs)
      .where(eq(completedJobs.targetCity, city));

    const count = jobs[0]?.count || 0;

    for (const milestone of milestones) {
      if (count === milestone) {
        // Check if we already sent this milestone
        const existing = await db.select().from(notifications)
          .where(and(
            eq(notifications.type, "milestone"),
            sql`JSON_EXTRACT(${notifications.metadata}, '$.milestone') = ${milestone}`,
            sql`JSON_EXTRACT(${notifications.metadata}, '$.city') = ${JSON.stringify(city)}`,
          ))
          .limit(1);

        if (existing.length === 0) {
          const cityName = CITY_STORM_DATA[city]?.name || city;
          const title = `🏆 Milestone: ${milestone} restorations completed in ${cityName}!`;
          const content = [
            `You've now completed ${milestone} hail damage restorations in ${cityName}.`,
            ``,
            `💡 ACTIONS:`,
            `• Update your landing page social proof counter`,
            `• Consider a "neighborhood completion" postcard campaign`,
            `• Your conversion data for ${cityName} is now statistically significant`,
          ].join("\n");

          await notifyOwner({ title, content });
          await createNotification({
            recipientType: "owner",
            type: "milestone",
            title,
            content,
            priority: "medium",
            channel: "owner_notify",
            delivered: true,
            deliveredAt: new Date(),
            read: false,
            metadata: { milestone, city, count },
          });

          triggered.push(`${cityName}: ${milestone}`);
        }
      }
    }
  }

  // Also check total leads
  const totalLeads = await db.select({ count: sql<number>`count(*)` }).from(leads);
  const leadCount = totalLeads[0]?.count || 0;
  const leadMilestones = [25, 50, 100, 250, 500];

  for (const milestone of leadMilestones) {
    if (leadCount === milestone) {
      const existing = await db.select().from(notifications)
        .where(and(
          eq(notifications.type, "milestone"),
          sql`JSON_EXTRACT(${notifications.metadata}, '$.milestone') = ${milestone}`,
          sql`JSON_EXTRACT(${notifications.metadata}, '$.type') = '"total_leads"'`,
        ))
        .limit(1);

      if (existing.length === 0) {
        const title = `📈 Milestone: ${milestone} total leads captured!`;
        const content = `Your Visualize system has now captured ${milestone} leads. Review your conversion funnel and optimize.`;

        await notifyOwner({ title, content });
        await createNotification({
          recipientType: "owner",
          type: "milestone",
          title,
          content,
          priority: "medium",
          channel: "owner_notify",
          delivered: true,
          deliveredAt: new Date(),
          read: false,
          metadata: { milestone, type: "total_leads", count: leadCount },
        });

        triggered.push(`Total leads: ${milestone}`);
      }
    }
  }

  return { triggered };
}

// ─── 10. Process Drip Sequence ────────────────────────────────────────────────

export async function processDripSequences(): Promise<{ processed: number }> {
  const db = await getDb();
  if (!db) return { processed: 0 };

  const now = new Date();

  // Find due drip messages that haven't been sent or cancelled
  const dueMessages = await db.select()
    .from(dripSequences)
    .where(and(
      eq(dripSequences.sent, false),
      eq(dripSequences.cancelled, false),
      lt(dripSequences.scheduledFor, now),
    ))
    .limit(50);

  let processed = 0;

  for (const drip of dueMessages) {
    // Get the lead
    const lead = await db.select().from(leads)
      .where(eq(leads.id, drip.leadId))
      .limit(1);

    if (!lead[0]) {
      // Lead deleted, cancel drip
      await db.update(dripSequences).set({ cancelled: true }).where(eq(dripSequences.id, drip.id));
      continue;
    }

    const l = lead[0];

    // If lead already contracted, cancel remaining drips
    if (l.status === "contracted" || l.status === "lost") {
      await db.update(dripSequences).set({ cancelled: true }).where(eq(dripSequences.id, drip.id));
      continue;
    }

    const cityData = CITY_STORM_DATA[l.targetCity as CitySlug];
    const cityName = cityData?.name || l.targetCity;
    const deadline = new Date("2027-03-10T00:00:00Z");
    const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    let title = "";
    let content = "";

    switch (drip.step) {
      case "24h":
        title = `What to Expect From Your Free Inspection — ${cityName}`;
        content = [
          `Hi ${l.firstName},`,
          ``,
          `A quick note about your upcoming free inspection:`,
          ``,
          `🔍 WHAT WE CHECK:`,
          `• Shingle damage (hail impacts, granule loss, cracking)`,
          `• Flashing and vent damage`,
          `• Gutter and downspout condition`,
          `• Siding and window trim`,
          ``,
          `📋 WHAT YOU'LL GET:`,
          `• A detailed damage report with photos`,
          `• An honest assessment — if there's no damage, we'll tell you`,
          `• Guidance on your insurance claim options`,
          ``,
          `The March 10 storm dropped confirmed ${cityData?.hailSize || "1.25\""} hail in your area.`,
          `Most damage is invisible from the ground.`,
          ``,
          `We'll be in touch shortly to schedule at your convenience.`,
          ``,
          `— Jones Restoration`,
        ].join("\n");
        break;

      case "3d":
        title = `Your Neighbors Are Moving Forward — ${cityName}`;
        content = [
          `Hi ${l.firstName},`,
          ``,
          `Quick update: since the March 10 storm, homeowners in ${cityName}`,
          `have been scheduling inspections at a steady pace.`,
          ``,
          `📊 Many of your neighbors have already:`,
          `• Had their roofs inspected`,
          `• Filed insurance claims`,
          `• Started their restorations`,
          ``,
          `⏰ Your insurance claim deadline is March 10, 2027 (${daysRemaining} days away).`,
          ``,
          `If you haven't scheduled your free inspection yet, there's still time —`,
          `but contractor availability gets tighter as the deadline approaches.`,
          ``,
          `Want to get on the schedule? Just reply to this message.`,
          ``,
          `— Jones Restoration`,
        ].join("\n");
        break;

      case "7d":
        title = `⏰ Don't Miss Your Window — ${daysRemaining} Days Until Deadline`;
        content = [
          `Hi ${l.firstName},`,
          ``,
          `This is a friendly reminder that your insurance claim window`,
          `for the March 10, 2026 hail storm closes on March 10, 2027.`,
          ``,
          `That's ${daysRemaining} days from today.`,
          ``,
          `If your roof was damaged and you don't file before the deadline,`,
          `you'll be responsible for the full cost of repairs out of pocket.`,
          ``,
          `A free inspection takes 30 minutes and costs you nothing.`,
          `If there's no damage, we'll tell you — no pressure, no obligation.`,
          ``,
          `📞 Ready to schedule? Reply here or call us directly.`,
          ``,
          `— Jones Restoration`,
          `Illinois Licensed | Serving ${cityName} since March 2026`,
        ].join("\n");
        break;
    }

    if (title && content) {
      const notifType = drip.step === "24h" ? "homeowner_drip_24h" :
        drip.step === "3d" ? "homeowner_drip_3d" : "homeowner_drip_7d";

      await createNotification({
        recipientType: "homeowner",
        recipientEmail: l.email,
        leadId: l.id,
        type: notifType,
        title,
        content,
        priority: drip.step === "7d" ? "high" : "medium",
        channel: "email",
        delivered: false,
        read: false,
        metadata: { step: drip.step, targetCity: l.targetCity, daysRemaining },
      });

      // Mark as sent
      await db.update(dripSequences).set({ sent: true, sentAt: now }).where(eq(dripSequences.id, drip.id));
      processed++;
    }
  }

  return { processed };
}

// ─── Query Helpers for In-App Panel ───────────────────────────────────────────

export async function getOwnerNotifications(limit: number = 20, unreadOnly: boolean = false) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(notifications.recipientType, "owner")];
  if (unreadOnly) conditions.push(eq(notifications.read, false));

  return await db.select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markNotificationRead(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ read: true, readAt: new Date() }).where(eq(notifications.id, id));
}

export async function markAllNotificationsRead(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications)
    .set({ read: true, readAt: new Date() })
    .where(and(eq(notifications.recipientType, "owner"), eq(notifications.read, false)));
}

export async function getUnreadCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.recipientType, "owner"), eq(notifications.read, false)));
  return result[0]?.count || 0;
}
