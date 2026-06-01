/**
 * LLM-Powered Next Action Generator
 *
 * Uses the built-in invokeLLM to generate specific, Chief of Staff-voiced
 * action recommendations based on lead context, scoring, and pipeline state.
 *
 * Personality: 50% J.A.R.V.I.S. (data-driven), 25% Alfred (anticipatory),
 * 15% IRAC (structured), 10% Oracle (strategic)
 */

import { invokeLLM } from "./_core/llm";
import type { Lead } from "../drizzle/schema";
import type { ScoringResult } from "./scoring";

interface LLMActionContext {
  lead: Partial<Lead>;
  scoring: ScoringResult;
  clusterBonus: number;
  nearbyLeadCount: number;
  nearbyJobCount: number;
  pipelineStats: {
    totalLeads: number;
    hotLeads: number;
    todayInspections: number;
    pipelineValue: number;
  };
}

interface LLMActionResult {
  primaryAction: string;
  reasoning: string;
  talkingPoints: string[];
  urgencyLevel: "immediate" | "today" | "this_week" | "can_wait";
  estimatedMinutes: number;
}

/**
 * Generate an AI-powered next action recommendation for a specific lead.
 * Returns a Chief of Staff-voiced briefing with specific, actionable instructions.
 */
export async function generateLLMAction(context: LLMActionContext): Promise<LLMActionResult> {
  const { lead, scoring, clusterBonus, nearbyLeadCount, nearbyJobCount, pipelineStats } = context;

  const systemPrompt = `You are the Chief of Staff for a storm damage restoration business owner. Your personality:
- 50% J.A.R.V.I.S.: Data-driven, precise, always citing numbers
- 25% Alfred: Anticipatory, already prepared the next step before being asked
- 15% IRAC: Structured reasoning (Issue, Rule, Application, Conclusion)
- 10% Oracle: Strategic, sees the bigger picture

Your job: Given a lead's full context, produce ONE specific, actionable next step that maximizes revenue per hour of the owner's time.

Rules:
- Be direct. No filler. Every word earns its place.
- Include specific dollar amounts, time estimates, and success probabilities.
- Reference nearby leads/jobs for routing efficiency when applicable.
- Factor in the insurance claim deadline (March 10, 2027).
- If the lead is stale, say so bluntly and explain the cost of inaction.
- Talking points should be things to SAY to the homeowner, not internal notes.`;

  const daysUntilDeadline = Math.ceil(
    (new Date("2027-03-10").getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const userPrompt = `LEAD CONTEXT:
- Name: ${lead.firstName || "Unknown"} ${lead.lastName || ""}
- Address: ${lead.address || "Unknown"}, ${lead.city || ""} ${lead.state || ""}
- City: ${lead.targetCity || "Unknown"}
- Status: ${lead.status || "new"}
- Source: ${lead.source || "landing_page"}
- Contractor selected: ${lead.contractorSelected || "unknown"}
- Claim filed: ${lead.claimFiled || "unknown"}
- Best contact time: ${lead.bestContactTime || "anytime"}
- Address verified in hail swath: ${lead.addressVerified ? "YES" : "NO"}
- Created: ${lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : "Unknown"}

SCORING:
- Expected Return: $${scoring.expectedReturn}/hr
- Estimated Job Value: $${scoring.estimatedJobValue}
- Close Probability: ${Math.round(scoring.closeProbability * 100)}%
- Time to Close: ${scoring.breakdown.timeToCloseHours}h
- Tier: ${scoring.tier}

GEOGRAPHIC CONTEXT:
- Cluster Bonus: ${clusterBonus} nearby leads/jobs
- Nearby Leads: ${nearbyLeadCount}
- Nearby Completed Jobs: ${nearbyJobCount} (available as social proof)

PIPELINE CONTEXT:
- Total active leads: ${pipelineStats.totalLeads}
- High-return leads: ${pipelineStats.hotLeads}
- Inspections scheduled today: ${pipelineStats.todayInspections}
- Total pipeline value: $${pipelineStats.pipelineValue.toLocaleString()}

DEADLINE: ${daysUntilDeadline} days until insurance claim deadline (March 10, 2027)

Generate the next action recommendation.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "next_action",
          strict: true,
          schema: {
            type: "object",
            properties: {
              primaryAction: {
                type: "string",
                description: "The single most important action to take right now. Be specific — include what to do, when, and expected outcome.",
              },
              reasoning: {
                type: "string",
                description: "Brief explanation of why this is the highest-return action (2-3 sentences max).",
              },
              talkingPoints: {
                type: "array",
                items: { type: "string" },
                description: "3-5 specific things to say to the homeowner during the interaction.",
              },
              urgencyLevel: {
                type: "string",
                enum: ["immediate", "today", "this_week", "can_wait"],
                description: "How urgently this action needs to happen.",
              },
              estimatedMinutes: {
                type: "number",
                description: "Estimated minutes this action will take.",
              },
            },
            required: ["primaryAction", "reasoning", "talkingPoints", "urgencyLevel", "estimatedMinutes"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices?.[0]?.message?.content;
    if (content && typeof content === "string") {
      return JSON.parse(content) as LLMActionResult;
    }
  } catch (error) {
    console.error("[LLM Actions] Failed to generate action:", error);
  }

  // Fallback to rule-based action if LLM fails
  return {
    primaryAction: `Contact ${lead.firstName || "lead"} — $${scoring.expectedReturn}/hr expected return.`,
    reasoning: "LLM unavailable. Falling back to rule-based recommendation based on scoring tier.",
    talkingPoints: [
      "Your property was confirmed in the March 10 hail path.",
      `${nearbyJobCount} of your neighbors have already completed their restoration.`,
      `The insurance claim deadline is ${daysUntilDeadline} days away.`,
    ],
    urgencyLevel: scoring.tier === "high_return" ? "immediate" : "today",
    estimatedMinutes: 15,
  };
}

/**
 * Generate the daily briefing summary using LLM.
 */
export async function generateDailyBriefing(stats: {
  newLeadsToday: number;
  hotLeads: { name: string; expectedReturn: number; city: string }[];
  staleLeads: number;
  pipelineValue: number;
  inspectionsToday: number;
  completedThisWeek: number;
}): Promise<string> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are the Chief of Staff delivering a morning briefing. Be concise, data-driven, and action-oriented. Format as a brief (under 200 words). Start with the single most important thing to do today. Use the personality: direct like J.A.R.V.I.S., anticipatory like Alfred.`,
        },
        {
          role: "user",
          content: `Morning briefing data:
- New leads overnight: ${stats.newLeadsToday}
- High-return leads requiring action: ${stats.hotLeads.map(l => `${l.name} in ${l.city} ($${l.expectedReturn}/hr)`).join(", ") || "None"}
- Stale leads (>72h no contact): ${stats.staleLeads}
- Total pipeline value: $${stats.pipelineValue.toLocaleString()}
- Inspections scheduled today: ${stats.inspectionsToday}
- Jobs completed this week: ${stats.completedThisWeek}
- Days until claim deadline: ${Math.ceil((new Date("2027-03-10").getTime() - Date.now()) / (1000 * 60 * 60 * 24))}

Generate the morning briefing.`,
        },
      ],
    });

    const briefingContent = response.choices?.[0]?.message?.content;
    return (typeof briefingContent === "string" ? briefingContent : null) || "Briefing generation failed. Check your pipeline manually.";
  } catch {
    return `Morning briefing: ${stats.hotLeads.length} high-return leads need action. ${stats.staleLeads} leads going stale. Pipeline value: $${stats.pipelineValue.toLocaleString()}.`;
  }
}
