/**
 * Visualize ROI-First Scoring Engine
 *
 * Instead of a traditional "how qualified is this lead?" score,
 * this engine computes Expected Return = (Job Value × Close Probability) / Time-to-Close.
 * The Next Action is assigned based on which action maximizes daily revenue per hour worked.
 */

import type { Lead } from "../drizzle/schema";
import { CITY_STORM_DATA, type CitySlug } from "../shared/stormData";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  estimatedJobValue: number;
  closeProbability: number;
  timeToCloseHours: number;
  expectedReturn: number;
  factors: {
    name: string;
    impact: string;
    detail: string;
  }[];
}

export interface ScoringResult {
  score: number; // 0-100 composite for backward compat
  estimatedJobValue: number;
  closeProbability: number;
  expectedReturn: number;
  breakdown: ScoreBreakdown;
  tier: "high_return" | "moderate_return" | "low_return" | "nurture";
  nextAction: string;
  nextActionDue: Date;
}

// ─── City-Based Job Value Estimates ───────────────────────────────────────────
// Average roof replacement cost by area (based on typical home sizes)
const CITY_AVG_JOB_VALUE: Record<string, number> = {
  naperville: 18000,       // Larger homes, higher-end market
  "willow-springs": 14000, // Mid-range suburban
  "sag-bridge": 12000,     // Smaller community
  palisades: 13000,        // Mid-range
};

// ─── Scoring Functions ────────────────────────────────────────────────────────

export function calculateLeadScore(lead: Partial<Lead>): ScoringResult {
  const factors: ScoreBreakdown["factors"] = [];

  // ── 1. Estimated Job Value ──────────────────────────────────────────────
  const citySlug = lead.targetCity || "naperville";
  let jobValue = CITY_AVG_JOB_VALUE[citySlug] || 14000;
  const cityData = CITY_STORM_DATA[citySlug as CitySlug];

  // Adjust by hail size (bigger hail = more damage = bigger job)
  if (cityData) {
    const hailInches = cityData.hailSizeInches;
    if (hailInches >= 2.0) {
      jobValue *= 1.3;
      factors.push({ name: "Large Hail", impact: "+30% job value", detail: `${hailInches}" hail confirmed — likely full replacement` });
    } else if (hailInches >= 1.5) {
      jobValue *= 1.15;
      factors.push({ name: "Significant Hail", impact: "+15% job value", detail: `${hailInches}" hail — probable full replacement` });
    }
  }

  // ── 2. Close Probability ────────────────────────────────────────────────
  let closeProbability = 0.30; // Base: 30% of leads close

  // No contractor = highest probability (no competition)
  if (lead.contractorSelected === "no") {
    closeProbability += 0.25;
    factors.push({ name: "No Contractor", impact: "+25% close probability", detail: "No competition — first mover advantage" });
  } else if (lead.contractorSelected === "unknown") {
    closeProbability += 0.10;
    factors.push({ name: "Undecided on Contractor", impact: "+10% close probability", detail: "Still shopping — winnable with strong presentation" });
  } else if (lead.contractorSelected === "yes") {
    closeProbability -= 0.15;
    factors.push({ name: "Has Contractor", impact: "-15% close probability", detail: "Already committed — high friction to displace" });
  }

  // No claim filed = we control the process
  if (lead.claimFiled === "no") {
    closeProbability += 0.15;
    factors.push({ name: "No Claim Filed", impact: "+15% close probability", detail: "We guide the claim process — builds dependency" });
  } else if (lead.claimFiled === "unknown") {
    closeProbability += 0.10;
    factors.push({ name: "Unsure About Claim", impact: "+10% close probability", detail: "Needs guidance — opportunity to add value" });
  }

  // Address verified in hail swath = insurance will pay
  if (lead.addressVerified) {
    closeProbability += 0.10;
    factors.push({ name: "Address Verified", impact: "+10% close probability", detail: "Confirmed in hail path — insurance payout likely" });
  }

  // QR code / postcard lead = high intent (physically held material)
  if (lead.qrCodeScanned || lead.source === "qr_code") {
    closeProbability += 0.10;
    factors.push({ name: "QR Code Lead", impact: "+10% close probability", detail: "Scanned physical material — high intent signal" });
  }

  // Source bonus
  if (lead.source === "referral") {
    closeProbability += 0.15;
    factors.push({ name: "Referral", impact: "+15% close probability", detail: "Referred by existing customer — pre-sold trust" });
  }

  // Cap probability
  closeProbability = Math.min(closeProbability, 0.95);
  closeProbability = Math.max(closeProbability, 0.05);

  // ── 3. Time-to-Close Estimate (hours of your time) ──────────────────────
  let timeToCloseHours = 4; // Base: 4 hours (drive + inspect + present + follow-up)

  if (lead.contractorSelected === "yes") {
    timeToCloseHours += 3; // Extra follow-up to displace competitor
    factors.push({ name: "Competitor Displacement", impact: "+3 hours", detail: "Need multiple touches to win from existing contractor" });
  }

  if (lead.status === "appointment_set") {
    timeToCloseHours -= 1; // Already past scheduling friction
  } else if (lead.status === "inspected") {
    timeToCloseHours -= 2; // Already inspected, just need to close
  }

  timeToCloseHours = Math.max(timeToCloseHours, 1);

  // ── 4. Time Decay — Lead Freshness ──────────────────────────────────────
  if (lead.createdAt) {
    const hoursOld = (Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60);
    if (hoursOld > 72) {
      closeProbability *= 0.7;
      factors.push({ name: "Stale Lead (72h+)", impact: "-30% close probability", detail: `Lead is ${Math.round(hoursOld)}h old — competitor may have reached them` });
    } else if (hoursOld > 24) {
      closeProbability *= 0.85;
      factors.push({ name: "Aging Lead (24h+)", impact: "-15% close probability", detail: `Lead is ${Math.round(hoursOld)}h old — urgency fading` });
    } else if (hoursOld < 2) {
      closeProbability *= 1.1;
      factors.push({ name: "Fresh Lead (<2h)", impact: "+10% close probability", detail: "Just submitted — strike while hot" });
    }
  }

  // ── 5. Expected Return ──────────────────────────────────────────────────
  const expectedReturn = Math.round((jobValue * closeProbability) / timeToCloseHours);

  // ── 6. Composite Score (0-100) for UI display ───────────────────────────
  // Normalize expectedReturn to 0-100 scale
  // $5,000/hr expected return = 100, $0 = 0
  const score = Math.min(100, Math.round((expectedReturn / 5000) * 100));

  // ── 7. Tier Assignment ──────────────────────────────────────────────────
  let tier: ScoringResult["tier"];
  if (expectedReturn >= 3000) {
    tier = "high_return";
  } else if (expectedReturn >= 1500) {
    tier = "moderate_return";
  } else if (expectedReturn >= 500) {
    tier = "low_return";
  } else {
    tier = "nurture";
  }

  // ── 8. Next Action Assignment ───────────────────────────────────────────
  const { nextAction, nextActionDue } = assignNextAction(lead, tier, expectedReturn);

  return {
    score,
    estimatedJobValue: Math.round(jobValue),
    closeProbability: Math.round(closeProbability * 100) / 100,
    expectedReturn,
    breakdown: {
      estimatedJobValue: Math.round(jobValue),
      closeProbability: Math.round(closeProbability * 100) / 100,
      timeToCloseHours,
      expectedReturn,
      factors,
    },
    tier,
    nextAction,
    nextActionDue,
  };
}

// ─── Next Action Engine ───────────────────────────────────────────────────────

function assignNextAction(
  lead: Partial<Lead>,
  tier: ScoringResult["tier"],
  expectedReturn: number
): { nextAction: string; nextActionDue: Date } {
  const now = new Date();

  // Status-based action assignment
  switch (lead.status) {
    case "new": {
      if (tier === "high_return") {
        return {
          nextAction: `CALL NOW — $${expectedReturn}/hr expected return. ${lead.firstName || "Lead"} in ${lead.targetCity || "area"}, no contractor selected, address verified. Call within 30 minutes.`,
          nextActionDue: new Date(now.getTime() + 30 * 60 * 1000), // 30 min
        };
      }
      if (tier === "moderate_return") {
        return {
          nextAction: `Call ${lead.firstName || "lead"} today — $${expectedReturn}/hr return. Schedule inspection for earliest available slot.`,
          nextActionDue: new Date(now.getTime() + 4 * 60 * 60 * 1000), // 4 hours
        };
      }
      return {
        nextAction: `Text ${lead.firstName || "lead"} to introduce yourself and gauge interest. Best contact time: ${lead.bestContactTime || "anytime"}.`,
        nextActionDue: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24 hours
      };
    }

    case "contacted": {
      return {
        nextAction: `Follow up with ${lead.firstName || "lead"} to schedule inspection. Mention ${lead.addressVerified ? "their address is confirmed in the hail path" : "the March 10 storm damage in their area"}.`,
        nextActionDue: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      };
    }

    case "appointment_set": {
      return {
        nextAction: `Prepare for inspection: Pre-load Jones collateral for ${lead.targetCity || "area"}. Check nearby completed jobs for social proof. Confirm appointment with ${lead.firstName || "homeowner"}.`,
        nextActionDue: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      };
    }

    case "inspected": {
      return {
        nextAction: `Close ${lead.firstName || "lead"}: Send damage report with photos. Estimated job value: $${lead.estimatedJobValue || "TBD"}. Follow up within 24h for authorization.`,
        nextActionDue: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      };
    }

    case "contracted": {
      return {
        nextAction: `Job contracted. Schedule materials and crew. Add before/after photos to Jones collateral when complete.`,
        nextActionDue: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      };
    }

    case "lost": {
      return {
        nextAction: `Lead lost. Consider re-engagement in 30 days as claim deadline approaches.`,
        nextActionDue: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      };
    }

    default: {
      return {
        nextAction: `Review lead and assign appropriate action.`,
        nextActionDue: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      };
    }
  }
}

// ─── Tier Display Helpers ─────────────────────────────────────────────────────

export function getTierLabel(tier: ScoringResult["tier"]): string {
  switch (tier) {
    case "high_return": return "High Return";
    case "moderate_return": return "Moderate Return";
    case "low_return": return "Low Return";
    case "nurture": return "Nurture";
  }
}

export function getTierColor(tier: ScoringResult["tier"]): string {
  switch (tier) {
    case "high_return": return "#16a34a";     // green
    case "moderate_return": return "#d97706";  // amber
    case "low_return": return "#6b7280";       // gray
    case "nurture": return "#9ca3af";          // light gray
  }
}
