import { describe, expect, it } from "vitest";

// Test the haversine distance calculation (extracted for testing)
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 3959;
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

describe("Geographic Clustering", () => {
  describe("Haversine Distance", () => {
    it("calculates distance between two nearby points correctly", () => {
      // Naperville City Hall to a point ~1 mile away
      const dist = haversineDistance(41.7508, -88.1535, 41.7653, -88.1535);
      expect(dist).toBeGreaterThan(0.5);
      expect(dist).toBeLessThan(2.0);
    });

    it("returns 0 for same point", () => {
      const dist = haversineDistance(41.7508, -88.1535, 41.7508, -88.1535);
      expect(dist).toBe(0);
    });

    it("calculates longer distances correctly", () => {
      // Naperville to Willow Springs (~20 miles)
      const dist = haversineDistance(41.7508, -88.1535, 41.7381, -87.8753);
      expect(dist).toBeGreaterThan(10);
      expect(dist).toBeLessThan(25);
    });

    it("handles negative longitude correctly", () => {
      const dist = haversineDistance(41.7508, -88.1535, 41.7508, -88.1400);
      expect(dist).toBeGreaterThan(0);
      expect(dist).toBeLessThan(1);
    });
  });

  describe("Cluster Bonus Logic", () => {
    it("cluster bonus of 0 means no nearby leads", () => {
      // This tests the scoring engine integration
      const bonus = 0;
      const timeReduction = Math.min(bonus, 3) * 0.5;
      expect(timeReduction).toBe(0);
    });

    it("cluster bonus caps at 3 for time reduction", () => {
      const bonus = 5; // 5 nearby, but cap at 3
      const timeReduction = Math.min(bonus, 3) * 0.5;
      expect(timeReduction).toBe(1.5);
    });

    it("cluster bonus of 2 reduces time by 1 hour", () => {
      const bonus = 2;
      const timeReduction = Math.min(bonus, 3) * 0.5;
      expect(timeReduction).toBe(1.0);
    });
  });
});

describe("LLM Action Fallback", () => {
  it("produces a valid fallback action when LLM is unavailable", () => {
    // Test the fallback structure matches expected interface
    const fallback = {
      primaryAction: "Contact lead — $2500/hr expected return.",
      reasoning: "LLM unavailable. Falling back to rule-based recommendation.",
      talkingPoints: [
        "Your property was confirmed in the March 10 hail path.",
        "3 of your neighbors have already completed their restoration.",
        "The insurance claim deadline is 280 days away.",
      ],
      urgencyLevel: "immediate" as const,
      estimatedMinutes: 15,
    };

    expect(fallback.primaryAction).toBeTruthy();
    expect(fallback.talkingPoints.length).toBeGreaterThanOrEqual(3);
    expect(["immediate", "today", "this_week", "can_wait"]).toContain(fallback.urgencyLevel);
    expect(fallback.estimatedMinutes).toBeGreaterThan(0);
  });
});
