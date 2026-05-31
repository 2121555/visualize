/**
 * Scheduled Handlers — Express route handlers for heartbeat cron callbacks.
 * All paths MUST start with /api/scheduled/
 *
 * These handlers are called by the Manus platform on schedule.
 * Auth: sdk.authenticateRequest(req) → user.isCron === true
 */

import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import {
  generateDailyBriefing,
  checkDeadlineEscalations,
  checkInspectionFollowups,
  checkMilestones,
  processDripSequences,
} from "./notifications";

// ─── Daily Briefing (runs every morning at 8am CT = 13:00 UTC) ────────────────

export async function dailyBriefingHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    const result = await generateDailyBriefing();
    res.json({ ok: true, ...result });
  } catch (error: any) {
    console.error("[Scheduled] Daily briefing error:", error);
    res.status(500).json({
      error: error.message || "Unknown error",
      stack: error.stack,
      context: { url: req.url, handler: "dailyBriefing" },
      timestamp: new Date().toISOString(),
    });
  }
}

// ─── Deadline Escalation Check (runs daily at 9am CT = 14:00 UTC) ─────────────

export async function deadlineEscalationHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    const result = await checkDeadlineEscalations();
    res.json({ ok: true, ...result });
  } catch (error: any) {
    console.error("[Scheduled] Deadline escalation error:", error);
    res.status(500).json({
      error: error.message || "Unknown error",
      stack: error.stack,
      context: { url: req.url, handler: "deadlineEscalation" },
      timestamp: new Date().toISOString(),
    });
  }
}

// ─── Inspection Follow-up Check (runs every 6 hours) ──────────────────────────

export async function inspectionFollowupHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    const result = await checkInspectionFollowups();
    res.json({ ok: true, ...result });
  } catch (error: any) {
    console.error("[Scheduled] Inspection followup error:", error);
    res.status(500).json({
      error: error.message || "Unknown error",
      stack: error.stack,
      context: { url: req.url, handler: "inspectionFollowup" },
      timestamp: new Date().toISOString(),
    });
  }
}

// ─── Milestone Check (runs daily at 10am CT = 15:00 UTC) ─────────────────────

export async function milestoneCheckHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    const result = await checkMilestones();
    res.json({ ok: true, ...result });
  } catch (error: any) {
    console.error("[Scheduled] Milestone check error:", error);
    res.status(500).json({
      error: error.message || "Unknown error",
      stack: error.stack,
      context: { url: req.url, handler: "milestoneCheck" },
      timestamp: new Date().toISOString(),
    });
  }
}

// ─── Drip Sequence Processor (runs every hour) ────────────────────────────────

export async function dripSequenceHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    const result = await processDripSequences();
    res.json({ ok: true, ...result });
  } catch (error: any) {
    console.error("[Scheduled] Drip sequence error:", error);
    res.status(500).json({
      error: error.message || "Unknown error",
      stack: error.stack,
      context: { url: req.url, handler: "dripSequence" },
      timestamp: new Date().toISOString(),
    });
  }
}
