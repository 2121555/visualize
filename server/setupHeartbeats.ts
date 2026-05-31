// Heartbeat Job Setup - Registers all scheduled cron jobs with the Manus platform.
// Call this once via a tRPC admin procedure to initialize all recurring jobs.
// Jobs can be managed via the Management UI > Settings > Schedules panel.

import { createHeartbeatJob, listHeartbeatJobs, deleteHeartbeatJob } from "./_core/heartbeat";
import type { HeartbeatJob } from "./_core/heartbeat";

const JOBS: HeartbeatJob[] = [
  {
    name: "visualize-daily-briefing",
    cron: "0 0 13 * * *",
    path: "/api/scheduled/daily-briefing",
    method: "POST",
    description: "Morning daily briefing with top actions, pipeline value, and stale leads",
  },
  {
    name: "visualize-deadline-escalation",
    cron: "0 0 14 * * *",
    path: "/api/scheduled/deadline-escalation",
    method: "POST",
    description: "Check for claim deadline escalation alerts (90/60/30/7 days)",
  },
  {
    name: "visualize-inspection-followup",
    cron: "0 0 */6 * * *",
    path: "/api/scheduled/inspection-followup",
    method: "POST",
    description: "Check for inspected leads that haven't advanced in 48h",
  },
  {
    name: "visualize-milestone-check",
    cron: "0 0 15 * * *",
    path: "/api/scheduled/milestone-check",
    method: "POST",
    description: "Check for social proof milestones (10/25/50/100 completions)",
  },
  {
    name: "visualize-drip-sequence",
    cron: "0 0 * * * *",
    path: "/api/scheduled/drip-sequence",
    method: "POST",
    description: "Process due homeowner drip sequence messages (24h/3d/7d)",
  },
];

export async function setupAllHeartbeatJobs(userSession: string): Promise<{
  created: string[];
  errors: string[];
}> {
  const created: string[] = [];
  const errors: string[] = [];

  // First, list existing jobs to avoid duplicates
  let existingJobs: string[] = [];
  try {
    const list = await listHeartbeatJobs(userSession);
    existingJobs = list.jobs.map(j => j.name);
  } catch (e) {
    // If listing fails, proceed with creation (will get conflict errors for duplicates)
  }

  for (const job of JOBS) {
    if (existingJobs.includes(job.name)) {
      created.push(`${job.name} (already exists)`);
      continue;
    }

    try {
      const result = await createHeartbeatJob(job, userSession);
      created.push(`${job.name} → taskUid: ${result.taskUid}`);
    } catch (error: any) {
      if (error.message?.includes("409") || error.message?.includes("CONFLICT")) {
        created.push(`${job.name} (already exists)`);
      } else {
        errors.push(`${job.name}: ${error.message}`);
      }
    }
  }

  return { created, errors };
}

export async function teardownAllHeartbeatJobs(userSession: string): Promise<{
  deleted: string[];
  errors: string[];
}> {
  const deleted: string[] = [];
  const errors: string[] = [];

  try {
    const list = await listHeartbeatJobs(userSession);
    for (const job of list.jobs) {
      if (job.name.startsWith("visualize-")) {
        try {
          await deleteHeartbeatJob(job.taskUid, userSession);
          deleted.push(job.name);
        } catch (error: any) {
          errors.push(`${job.name}: ${error.message}`);
        }
      }
    }
  } catch (error: any) {
    errors.push(`Failed to list jobs: ${error.message}`);
  }

  return { deleted, errors };
}
