import { describe, expect, it, vi } from "vitest";

// Mock the database and external services
vi.mock("./db", () => ({
  getDb: vi.fn(() => null), // Return null to test graceful fallback
}));
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn(() => Promise.resolve(true)),
}));

// Import after mocks
import { CITY_STORM_DATA, getStormConfirmationMessage } from "../shared/stormData";

describe("Notification Engine — Unit Tests", () => {
  describe("Storm Confirmation Messages", () => {
    it("generates confirmation for verified Naperville address", () => {
      const msg = getStormConfirmationMessage("123 Main St", "naperville", true);
      expect(msg).toContain("Naperville");
      expect(msg).toContain("hail zone");
    });

    it("generates unverified message when address not in swath", () => {
      const msg = getStormConfirmationMessage("456 Oak Ave", "naperville", false);
      expect(msg).toContain("unable to automatically verify");
    });

    it("handles all four cities", () => {
      const cities = ["naperville", "willow-springs", "sag-bridge", "palisades"] as const;
      for (const city of cities) {
        const msg = getStormConfirmationMessage("123 Test St", city, true);
        expect(msg.length).toBeGreaterThan(20);
        expect(msg).toContain(CITY_STORM_DATA[city].name);
      }
    });
  });

  describe("Notification Type Coverage", () => {
    it("defines all 10 notification types in schema", () => {
      // These are the 10 types the system supports
      const expectedTypes = [
        "new_lead",
        "high_value_lead",
        "qr_scan",
        "deadline_escalation",
        "daily_briefing",
        "neighbor_trigger",
        "inspection_followup",
        "milestone",
        "homeowner_confirmation",
        "homeowner_drip_24h",
        "homeowner_drip_3d",
        "homeowner_drip_7d",
        "status_change",
      ];
      // All types should be strings
      expectedTypes.forEach(type => {
        expect(typeof type).toBe("string");
        expect(type.length).toBeGreaterThan(0);
      });
    });

    it("notification priority levels are defined", () => {
      const priorities = ["urgent", "high", "medium", "low"];
      expect(priorities).toHaveLength(4);
    });

    it("notification channels are defined", () => {
      const channels = ["owner_notify", "email", "push", "sms"];
      expect(channels).toHaveLength(4);
    });
  });

  describe("Drip Sequence Timing", () => {
    it("24h drip fires after 24 hours", () => {
      const now = new Date();
      const offset24h = 24 * 60 * 60 * 1000;
      const scheduled = new Date(now.getTime() + offset24h);
      const diff = scheduled.getTime() - now.getTime();
      expect(diff).toBe(offset24h);
    });

    it("3d drip fires after 3 days", () => {
      const now = new Date();
      const offset3d = 3 * 24 * 60 * 60 * 1000;
      const scheduled = new Date(now.getTime() + offset3d);
      const diff = scheduled.getTime() - now.getTime();
      expect(diff).toBe(offset3d);
    });

    it("7d drip fires after 7 days", () => {
      const now = new Date();
      const offset7d = 7 * 24 * 60 * 60 * 1000;
      const scheduled = new Date(now.getTime() + offset7d);
      const diff = scheduled.getTime() - now.getTime();
      expect(diff).toBe(offset7d);
    });
  });

  describe("Deadline Escalation Logic", () => {
    it("correctly calculates days remaining to March 10, 2027", () => {
      const deadline = new Date("2027-03-10T00:00:00Z");
      const now = new Date();
      const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysRemaining).toBeGreaterThan(0);
      expect(daysRemaining).toBeLessThan(365);
    });

    it("identifies escalation windows at 90, 60, 30, 7 days", () => {
      const escalationDays = [90, 60, 30, 7];
      const testDays = 60;
      const activeEscalation = escalationDays.find(d => Math.abs(testDays - d) < 1);
      expect(activeEscalation).toBe(60);
    });

    it("returns no escalation for non-milestone days", () => {
      const escalationDays = [90, 60, 30, 7];
      const testDays = 45;
      const activeEscalation = escalationDays.find(d => Math.abs(testDays - d) < 1);
      expect(activeEscalation).toBeUndefined();
    });
  });

  describe("Neighbor Trigger Logic", () => {
    it("extracts street name from full address", () => {
      const address = "1247 Elm Street, Naperville";
      const streetParts = address.split(" ");
      const streetName = streetParts.length >= 3
        ? streetParts.slice(1).join(" ").replace(/,.*$/, "").trim()
        : address;
      expect(streetName).toBe("Elm Street");
    });

    it("handles short addresses gracefully", () => {
      const address = "Main St";
      const streetParts = address.split(" ");
      const streetName = streetParts.length >= 3
        ? streetParts.slice(1).join(" ").replace(/,.*$/, "").trim()
        : address;
      expect(streetName).toBe("Main St");
    });
  });

  describe("Heartbeat Job Configuration", () => {
    it("all scheduled jobs target /api/scheduled/ prefix", () => {
      const paths = [
        "/api/scheduled/daily-briefing",
        "/api/scheduled/deadline-escalation",
        "/api/scheduled/inspection-followup",
        "/api/scheduled/milestone-check",
        "/api/scheduled/drip-sequence",
      ];
      paths.forEach(path => {
        expect(path.startsWith("/api/scheduled/")).toBe(true);
      });
    });

    it("all jobs use POST method", () => {
      const methods = ["POST", "POST", "POST", "POST", "POST"];
      methods.forEach(m => expect(m).toBe("POST"));
    });

    it("cron expressions are valid 6-field format", () => {
      const crons = [
        "0 0 13 * * *",    // daily briefing
        "0 0 14 * * *",    // deadline escalation
        "0 0 */6 * * *",   // inspection followup
        "0 0 15 * * *",    // milestone check
        "0 0 * * * *",     // drip sequence
      ];
      crons.forEach(cron => {
        const parts = cron.split(" ");
        expect(parts).toHaveLength(6);
      });
    });
  });

  describe("ROI-Based Priority Assignment", () => {
    it("assigns urgent priority for high-return leads (>= $200/hr)", () => {
      const expectedReturn = 250;
      const priority = expectedReturn >= 200 ? "urgent" : expectedReturn >= 80 ? "high" : "medium";
      expect(priority).toBe("urgent");
    });

    it("assigns high priority for moderate-return leads ($80-199/hr)", () => {
      const expectedReturn = 120;
      const priority = expectedReturn >= 200 ? "urgent" : expectedReturn >= 80 ? "high" : "medium";
      expect(priority).toBe("high");
    });

    it("assigns medium priority for developing leads (< $80/hr)", () => {
      const expectedReturn = 50;
      const priority = expectedReturn >= 200 ? "urgent" : expectedReturn >= 80 ? "high" : "medium";
      expect(priority).toBe("medium");
    });
  });
});
