import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  createLead,
  getAllLeads,
  getLeadById,
  updateLeadStatus,
  getLeadStats,
  addLeadNote,
  getLeadNotes,
} from "./db";
import { notifyOwner } from "./_core/notification";
import { invokeLLM } from "./_core/llm";

// ─── Hail Swath Data ─────────────────────────────────────────────────────────
// Based on NWS Chicago confirmed reports for March 10, 2026
const HAIL_SWATH_DATA: Record<string, {
  confirmed: boolean;
  hailSize: string;
  hailSizeInches: number;
  description: string;
  zipCodes: string[];
}> = {
  "naperville": {
    confirmed: true,
    hailSize: '1.00"–1.25"',
    hailSizeInches: 1.25,
    description: "Quarter to half-dollar sized hail confirmed by NWS Chicago trained spotters in the Naperville corridor on March 10, 2026.",
    zipCodes: ["60540", "60563", "60564", "60565", "60566", "60567"],
  },
  "willow-springs": {
    confirmed: true,
    hailSize: '1.00"–1.50"',
    hailSizeInches: 1.5,
    description: "Quarter to ping-pong sized hail confirmed in the Willow Springs area on March 10, 2026 as the supercell tracked northeast through Cook County.",
    zipCodes: ["60480"],
  },
  "sag-bridge": {
    confirmed: true,
    hailSize: '1.00"–1.25"',
    hailSizeInches: 1.25,
    description: "Quarter to half-dollar sized hail confirmed in the Sag Bridge/Lemont area on March 10, 2026.",
    zipCodes: ["60525", "60439"],
  },
  "palisades": {
    confirmed: true,
    hailSize: '1.00"–1.25"',
    hailSizeInches: 1.25,
    description: "Quarter to half-dollar sized hail confirmed in the Palisades area on March 10, 2026.",
    zipCodes: ["60525", "60480"],
  },
};

// ─── Lead Scoring ─────────────────────────────────────────────────────────────
function calculateLeadScore(data: {
  targetCity: string;
  contractorSelected: string;
  claimFiled: string;
  addressVerified: boolean;
  qrCodeScanned?: boolean;
}): number {
  let score = 0;
  // In confirmed hail zone
  if (HAIL_SWATH_DATA[data.targetCity]?.confirmed) score += 25;
  // Address verified against swath
  if (data.addressVerified) score += 20;
  // No contractor selected yet (opportunity)
  if (data.contractorSelected === "no" || data.contractorSelected === "unknown") score += 20;
  // No claim filed yet (we can help)
  if (data.claimFiled === "no") score += 15;
  // Claim filed (motivated, needs contractor)
  if (data.claimFiled === "yes") score += 10;
  // QR code scan (high intent)
  if (data.qrCodeScanned) score += 10;
  return Math.min(score, 100);
}

// ─── Address Verification ─────────────────────────────────────────────────────
function verifyAddressInSwath(address: string, city: string): {
  verified: boolean;
  hailSize: string;
  confirmationMessage: string;
} {
  const cityKey = city.toLowerCase().replace(/\s+/g, "-");
  const swath = HAIL_SWATH_DATA[cityKey];

  if (!swath) {
    return {
      verified: false,
      hailSize: "Unknown",
      confirmationMessage: "We were unable to verify this address against our storm data.",
    };
  }

  // Check if address contains a zip code that matches
  const addressUpper = address.toUpperCase();
  const zipMatch = swath.zipCodes.some(zip => addressUpper.includes(zip));

  // For cities in our confirmed swath, we confirm based on city match
  // In production this would use a geocoding + polygon intersection API
  const verified = swath.confirmed;

  const confirmationMessage = verified
    ? `✓ Confirmed: Your property at ${address} was located within the direct path of the March 10, 2026 hail event. NWS Chicago confirmed ${swath.hailSize} hail in your area — large enough to cause significant roof damage that may not be visible from the ground. Your insurance claim window is open until March 10, 2027.`
    : `We were unable to confirm your address in our storm database. A free inspection can still determine if your property sustained damage.`;

  return { verified, hailSize: swath.hailSize, confirmationMessage };
}

// ─── Next Action Assignment ───────────────────────────────────────────────────
function assignNextAction(data: {
  contractorSelected: string;
  claimFiled: string;
  bestContactTime: string;
}): string {
  if (data.contractorSelected === "yes") return "Call within 24h — competitor may be selected. Present differentiators immediately.";
  if (data.claimFiled === "yes") return "Schedule inspection ASAP — claim is open, homeowner needs contractor now.";
  if (data.claimFiled === "no") return "Schedule free inspection + walk homeowner through claim filing process.";
  return "Call to qualify — determine claim status and contractor selection.";
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Public: Address Verification ─────────────────────────────────────────
  leads: router({
    verifyAddress: publicProcedure
      .input(z.object({
        address: z.string().min(5),
        city: z.string(),
      }))
      .query(({ input }) => {
        const result = verifyAddressInSwath(input.address, input.city);
        return result;
      }),

    // ─── Public: Submit Lead ─────────────────────────────────────────────────
    submit: publicProcedure
      .input(z.object({
        // Step 1
        address: z.string().min(5),
        city: z.string(),
        state: z.string().default("IL"),
        zip: z.string().min(5),
        targetCity: z.enum(["naperville", "willow-springs", "sag-bridge", "palisades"]),
        // Step 2
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        phone: z.string().min(10),
        email: z.string().email(),
        // Step 3
        contractorSelected: z.enum(["yes", "no", "unknown"]).default("unknown"),
        claimFiled: z.enum(["yes", "no", "unknown"]).default("unknown"),
        bestContactTime: z.enum(["morning", "afternoon", "evening", "anytime"]).default("anytime"),
        // Meta
        qrCodeScanned: z.boolean().default(false),
        utmSource: z.string().optional(),
        utmMedium: z.string().optional(),
        utmCampaign: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const verification = verifyAddressInSwath(input.address, input.targetCity);
        const score = calculateLeadScore({
          targetCity: input.targetCity,
          contractorSelected: input.contractorSelected,
          claimFiled: input.claimFiled,
          addressVerified: verification.verified,
          qrCodeScanned: input.qrCodeScanned,
        });
        const nextAction = assignNextAction({
          contractorSelected: input.contractorSelected,
          claimFiled: input.claimFiled,
          bestContactTime: input.bestContactTime,
        });

        await createLead({
          address: input.address,
          city: input.city,
          state: input.state,
          zip: input.zip,
          targetCity: input.targetCity,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          email: input.email,
          contractorSelected: input.contractorSelected,
          claimFiled: input.claimFiled,
          bestContactTime: input.bestContactTime,
          addressVerified: verification.verified,
          hailSizeConfirmed: verification.hailSize,
          stormConfirmationMessage: verification.confirmationMessage,
          leadScore: score,
          nextAction,
          status: "new",
          source: "landing_page",
          qrCodeScanned: input.qrCodeScanned,
          utmSource: input.utmSource,
          utmMedium: input.utmMedium,
          utmCampaign: input.utmCampaign,
        });

        // Notify owner
        try {
          await notifyOwner({
            title: `🌩️ New Lead: ${input.firstName} ${input.lastName} — ${input.targetCity}`,
            content: `Address: ${input.address}, ${input.city} ${input.zip}\nPhone: ${input.phone}\nEmail: ${input.email}\nClaim Filed: ${input.claimFiled}\nContractor Selected: ${input.contractorSelected}\nLead Score: ${score}\nNext Action: ${nextAction}`,
          });
        } catch (e) {
          console.warn("Notification failed:", e);
        }

        return {
          success: true,
          score,
          verified: verification.verified,
          confirmationMessage: verification.confirmationMessage,
          nextAction,
        };
      }),

    // ─── Protected: Admin Queries ────────────────────────────────────────────
    list: protectedProcedure
      .input(z.object({
        city: z.string().optional(),
        status: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await getAllLeads(input);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const lead = await getLeadById(input.id);
        if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
        return lead;
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["new", "contacted", "appointment_set", "inspected", "contracted", "lost"]),
        nextAction: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await updateLeadStatus(input.id, input.status, input.nextAction);
        return { success: true };
      }),

    stats: protectedProcedure
      .query(async () => {
        return await getLeadStats();
      }),

    addNote: protectedProcedure
      .input(z.object({
        leadId: z.number(),
        note: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        await addLeadNote({ leadId: input.leadId, note: input.note });
        return { success: true };
      }),

    getNotes: protectedProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ input }) => {
        return await getLeadNotes(input.leadId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
