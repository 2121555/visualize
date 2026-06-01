/**
 * Geographic Clustering Module
 *
 * Calculates how many other leads and completed jobs are within a radius
 * of a given lead. This "cluster bonus" reduces the time-to-close estimate
 * because multiple inspections can be routed in a single trip.
 */

import { getDb } from "./db";
import { leads, completedJobs } from "../drizzle/schema";
import { and, ne, isNotNull, eq } from "drizzle-orm";

// Haversine distance in miles between two lat/lng points
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 3959; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate the cluster bonus for a lead.
 * Returns the number of nearby leads + completed jobs within the radius.
 */
export async function calculateClusterBonus(
  leadId: number,
  lat: number,
  lng: number,
  radiusMiles: number = 1.0
): Promise<{ bonus: number; nearbyLeads: number[]; nearbyJobs: number[] }> {
  const db = await getDb();
  if (!db) return { bonus: 0, nearbyLeads: [], nearbyJobs: [] };

  // Get all other leads with coordinates
  const allLeads = await db
    .select({ id: leads.id, lat: leads.lat, lng: leads.lng })
    .from(leads)
    .where(and(
      ne(leads.id, leadId),
      isNotNull(leads.lat),
      isNotNull(leads.lng)
    ));

  // Get all completed jobs with coordinates
  const allJobs = await db
    .select({ id: completedJobs.id, lat: completedJobs.lat, lng: completedJobs.lng })
    .from(completedJobs);

  const nearbyLeads: number[] = [];
  const nearbyJobs: number[] = [];

  // Find nearby leads
  for (const lead of allLeads) {
    if (lead.lat && lead.lng) {
      const dist = haversineDistance(lat, lng, parseFloat(lead.lat), parseFloat(lead.lng));
      if (dist <= radiusMiles) {
        nearbyLeads.push(lead.id);
      }
    }
  }

  // Find nearby completed jobs
  for (const job of allJobs) {
    if (job.lat && job.lng) {
      const dist = haversineDistance(lat, lng, parseFloat(job.lat), parseFloat(job.lng));
      if (dist <= radiusMiles) {
        nearbyJobs.push(job.id);
      }
    }
  }

  const bonus = nearbyLeads.length + nearbyJobs.length;

  return { bonus, nearbyLeads, nearbyJobs };
}

/**
 * Get routing suggestions — groups leads by proximity for efficient trip planning.
 * Returns clusters of leads that can be visited in a single trip.
 */
export async function getRoutingClusters(
  targetCity?: string
): Promise<{ clusterId: number; leads: { id: number; address: string; lat: number; lng: number }[] }[]> {
  const db = await getDb();
  if (!db) return [];

  let query = db
    .select({
      id: leads.id,
      address: leads.address,
      lat: leads.lat,
      lng: leads.lng,
      status: leads.status,
    })
    .from(leads)
    .where(and(
      isNotNull(leads.lat),
      isNotNull(leads.lng)
    ));

  const allLeads = await query;

  // Filter by city if specified
  const filteredLeads = targetCity
    ? allLeads.filter((l) => l.address.toLowerCase().includes(targetCity.toLowerCase()))
    : allLeads;

  // Simple greedy clustering: group leads within 1 mile of each other
  const clusters: { clusterId: number; leads: { id: number; address: string; lat: number; lng: number }[] }[] = [];
  const assigned = new Set<number>();

  let clusterId = 1;
  for (const lead of filteredLeads) {
    if (assigned.has(lead.id) || !lead.lat || !lead.lng) continue;

    const cluster = [{
      id: lead.id,
      address: lead.address,
      lat: parseFloat(lead.lat),
      lng: parseFloat(lead.lng),
    }];
    assigned.add(lead.id);

    // Find all unassigned leads within 1 mile
    for (const other of filteredLeads) {
      if (assigned.has(other.id) || !other.lat || !other.lng) continue;
      const dist = haversineDistance(
        parseFloat(lead.lat), parseFloat(lead.lng),
        parseFloat(other.lat), parseFloat(other.lng)
      );
      if (dist <= 1.0) {
        cluster.push({
          id: other.id,
          address: other.address,
          lat: parseFloat(other.lat),
          lng: parseFloat(other.lng),
        });
        assigned.add(other.id);
      }
    }

    if (cluster.length > 1) {
      clusters.push({ clusterId, leads: cluster });
      clusterId++;
    }
  }

  return clusters;
}
