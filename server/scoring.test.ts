import { describe, expect, it } from "vitest";
import { calculateLeadScore, getTierLabel, getTierColor } from "./scoring";
import type { Lead } from "../drizzle/schema";

function makeLead(overrides: Partial<Lead> = {}): Partial<Lead> {
  return {
    id: 1,
    targetCity: "naperville",
    firstName: "John",
    lastName: "Doe",
    address: "123 Main St, Naperville, IL 60540",
    email: "john@example.com",
    phone: "6305551234",
    contractorSelected: "no",
    claimFiled: "no",
    addressVerified: true,
    status: "new",
    source: "landing_page",
    createdAt: new Date(), // fresh lead
    ...overrides,
  };
}

describe("ROI-First Scoring Engine", () => {
  describe("calculateLeadScore", () => {
    it("returns a valid ScoringResult structure", () => {
      const result = calculateLeadScore(makeLead());
      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("estimatedJobValue");
      expect(result).toHaveProperty("closeProbability");
      expect(result).toHaveProperty("expectedReturn");
      expect(result).toHaveProperty("breakdown");
      expect(result).toHaveProperty("tier");
      expect(result).toHaveProperty("nextAction");
      expect(result).toHaveProperty("nextActionDue");
    });

    it("score is between 0 and 100", () => {
      const result = calculateLeadScore(makeLead());
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("closeProbability is between 0.05 and 0.95", () => {
      const result = calculateLeadScore(makeLead());
      expect(result.closeProbability).toBeGreaterThanOrEqual(0.05);
      expect(result.closeProbability).toBeLessThanOrEqual(0.95);
    });

    it("expectedReturn is a positive number", () => {
      const result = calculateLeadScore(makeLead());
      expect(result.expectedReturn).toBeGreaterThan(0);
    });

    it("Naperville has higher job value than Sag Bridge", () => {
      const naperville = calculateLeadScore(makeLead({ targetCity: "naperville" }));
      const sagBridge = calculateLeadScore(makeLead({ targetCity: "sag-bridge" }));
      expect(naperville.estimatedJobValue).toBeGreaterThan(sagBridge.estimatedJobValue);
    });

    it("no contractor + no claim = highest close probability", () => {
      const ideal = calculateLeadScore(makeLead({
        contractorSelected: "no",
        claimFiled: "no",
        addressVerified: true,
      }));
      const hasContractor = calculateLeadScore(makeLead({
        contractorSelected: "yes",
        claimFiled: "yes",
        addressVerified: false,
      }));
      expect(ideal.closeProbability).toBeGreaterThan(hasContractor.closeProbability);
    });

    it("having a contractor lowers close probability", () => {
      const noContractor = calculateLeadScore(makeLead({ contractorSelected: "no" }));
      const hasContractor = calculateLeadScore(makeLead({ contractorSelected: "yes" }));
      expect(noContractor.closeProbability).toBeGreaterThan(hasContractor.closeProbability);
    });

    it("QR code lead gets higher close probability", () => {
      const qrLead = calculateLeadScore(makeLead({ source: "qr_code", qrCodeScanned: true }));
      const normalLead = calculateLeadScore(makeLead({ source: "landing_page", qrCodeScanned: false }));
      expect(qrLead.closeProbability).toBeGreaterThan(normalLead.closeProbability);
    });

    it("referral lead gets higher close probability", () => {
      const referral = calculateLeadScore(makeLead({ source: "referral" }));
      const normalLead = calculateLeadScore(makeLead({ source: "landing_page" }));
      expect(referral.closeProbability).toBeGreaterThan(normalLead.closeProbability);
    });

    it("stale lead (72h+) gets lower close probability", () => {
      const fresh = calculateLeadScore(makeLead({ createdAt: new Date() }));
      const stale = calculateLeadScore(makeLead({
        createdAt: new Date(Date.now() - 80 * 60 * 60 * 1000),
      }));
      expect(fresh.closeProbability).toBeGreaterThan(stale.closeProbability);
    });

    it("having a contractor increases time-to-close", () => {
      const noContractor = calculateLeadScore(makeLead({ contractorSelected: "no" }));
      const hasContractor = calculateLeadScore(makeLead({ contractorSelected: "yes" }));
      expect(hasContractor.breakdown.timeToCloseHours).toBeGreaterThan(
        noContractor.breakdown.timeToCloseHours
      );
    });

    it("expectedReturn = (jobValue * closeProbability) / timeToClose", () => {
      const result = calculateLeadScore(makeLead());
      const calculated = Math.round(
        (result.breakdown.estimatedJobValue * result.breakdown.closeProbability) /
        result.breakdown.timeToCloseHours
      );
      expect(result.expectedReturn).toBe(calculated);
    });

    it("breakdown includes factors array", () => {
      const result = calculateLeadScore(makeLead());
      expect(Array.isArray(result.breakdown.factors)).toBe(true);
      expect(result.breakdown.factors.length).toBeGreaterThan(0);
      result.breakdown.factors.forEach((f) => {
        expect(f).toHaveProperty("name");
        expect(f).toHaveProperty("impact");
        expect(f).toHaveProperty("detail");
      });
    });
  });

  describe("tier assignment", () => {
    it("high-value ideal lead gets high_return tier", () => {
      const result = calculateLeadScore(makeLead({
        targetCity: "naperville",
        contractorSelected: "no",
        claimFiled: "no",
        addressVerified: true,
        source: "referral",
        createdAt: new Date(),
      }));
      expect(result.tier).toBe("high_return");
    });

    it("lead with contractor gets lower tier than without", () => {
      const tiers = ["high_return", "moderate_return", "low_return", "nurture"];
      const ideal = calculateLeadScore(makeLead({ contractorSelected: "no" }));
      const hasContractor = calculateLeadScore(makeLead({ contractorSelected: "yes" }));
      expect(tiers.indexOf(ideal.tier)).toBeLessThanOrEqual(tiers.indexOf(hasContractor.tier));
    });
  });

  describe("next action assignment", () => {
    it("new high_return lead gets CALL NOW action", () => {
      const result = calculateLeadScore(makeLead({
        targetCity: "naperville",
        contractorSelected: "no",
        claimFiled: "no",
        addressVerified: true,
        source: "referral",
        status: "new",
        createdAt: new Date(),
      }));
      expect(result.nextAction).toContain("CALL NOW");
    });

    it("appointment_set lead gets inspection prep action", () => {
      const result = calculateLeadScore(makeLead({ status: "appointment_set" }));
      expect(result.nextAction.toLowerCase()).toContain("inspect");
    });

    it("contracted lead gets scheduling action", () => {
      const result = calculateLeadScore(makeLead({ status: "contracted" }));
      expect(result.nextAction.toLowerCase()).toContain("schedule");
    });

    it("lost lead gets re-engagement action", () => {
      const result = calculateLeadScore(makeLead({ status: "lost" }));
      expect(result.nextAction.toLowerCase()).toContain("lost");
    });

    it("nextActionDue is in the future", () => {
      const result = calculateLeadScore(makeLead());
      expect(result.nextActionDue.getTime()).toBeGreaterThan(Date.now() - 1000);
    });
  });

  describe("helper functions", () => {
    it("getTierLabel returns human-readable labels", () => {
      expect(getTierLabel("high_return")).toBe("High Return");
      expect(getTierLabel("moderate_return")).toBe("Moderate Return");
      expect(getTierLabel("low_return")).toBe("Low Return");
      expect(getTierLabel("nurture")).toBe("Nurture");
    });

    it("getTierColor returns valid hex colors", () => {
      const hexRegex = /^#[0-9a-f]{6}$/;
      expect(getTierColor("high_return")).toMatch(hexRegex);
      expect(getTierColor("moderate_return")).toMatch(hexRegex);
      expect(getTierColor("low_return")).toMatch(hexRegex);
      expect(getTierColor("nurture")).toMatch(hexRegex);
    });
  });
});
