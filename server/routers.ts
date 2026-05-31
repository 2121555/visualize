import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  createLead, getAllLeads, getLeadById, updateLeadStatus, updateLeadScoring,
  getLeadStats, addLeadNote, getLeadNotes, getCityStats, getRecentActivity,
  createCompletedJob, getCompletedJobs, getNearbyCompletedJobs, getCompletedJobById,
} from "./db";
import { notifyOwner } from "./_core/notification";
import { calculateLeadScore } from "./scoring";
import { verifyAddressInHailZone } from "./addressVerification";
import { storagePut } from "./storage";

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

  leads: router({
    // ─── Public: Address Verification ───────────────────────────────────
    verifyAddress: publicProcedure
      .input(z.object({
        address: z.string().min(5),
        city: z.string(),
      }))
      .mutation(async ({ input }) => {
        const result = await verifyAddressInHailZone(input.address, input.city);
        return result;
      }),

    // ─── Public: Submit Lead ────────────────────────────────────────────
    submit: publicProcedure
      .input(z.object({
        address: z.string().min(5),
        city: z.string(),
        state: z.string().default("IL"),
        zip: z.string().min(5),
        targetCity: z.enum(["naperville", "willow-springs", "sag-bridge", "palisades"]),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        phone: z.string().min(10),
        email: z.string().email(),
        contractorSelected: z.enum(["yes", "no", "unknown"]).default("unknown"),
        claimFiled: z.enum(["yes", "no", "unknown"]).default("unknown"),
        bestContactTime: z.enum(["morning", "afternoon", "evening", "anytime"]).default("anytime"),
        source: z.enum(["landing_page", "qr_code", "direct", "referral"]).default("landing_page"),
        qrCodeScanned: z.boolean().default(false),
        // Address verification results from Step 1
        addressVerified: z.boolean().default(false),
        lat: z.string().optional(),
        lng: z.string().optional(),
        hailSizeConfirmed: z.string().optional(),
        stormConfirmationMsg: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Calculate ROI-first score
        const scoring = calculateLeadScore({
          targetCity: input.targetCity,
          contractorSelected: input.contractorSelected,
          claimFiled: input.claimFiled,
          addressVerified: input.addressVerified,
          qrCodeScanned: input.qrCodeScanned,
          source: input.source,
          status: "new",
          createdAt: new Date(),
          firstName: input.firstName,
        } as any);

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
          addressVerified: input.addressVerified,
          lat: input.lat || null,
          lng: input.lng || null,
          hailSizeConfirmed: input.hailSizeConfirmed || null,
          stormConfirmationMsg: input.stormConfirmationMsg || null,
          leadScore: scoring.score,
          estimatedJobValue: scoring.estimatedJobValue,
          closeProbability: String(scoring.closeProbability),
          expectedReturn: scoring.expectedReturn,
          scoreBreakdown: scoring.breakdown,
          nextAction: scoring.nextAction,
          nextActionDue: scoring.nextActionDue,
          status: "new",
          source: input.source,
          qrCodeScanned: input.qrCodeScanned,
        });

        // Notify owner
        try {
          const tierLabel = scoring.tier === "high_return" ? "HIGH RETURN" : scoring.tier === "moderate_return" ? "MODERATE" : "LOW";
          await notifyOwner({
            title: `New Lead: ${input.firstName} ${input.lastName} — ${tierLabel} ($${scoring.expectedReturn}/hr)`,
            content: `Address: ${input.address}, ${input.city} ${input.zip}\nPhone: ${input.phone}\nEmail: ${input.email}\nClaim Filed: ${input.claimFiled}\nContractor: ${input.contractorSelected}\nEstimated Job: $${scoring.estimatedJobValue}\nExpected Return: $${scoring.expectedReturn}/hr\nScore: ${scoring.score}/100\nNext Action: ${scoring.nextAction}`,
          });
        } catch (e) {
          console.warn("Notification failed:", e);
        }

        return {
          success: true,
          score: scoring.score,
          tier: scoring.tier,
          verified: input.addressVerified,
          confirmationMessage: input.stormConfirmationMsg || "",
        };
      }),

    // ─── Public: Social Proof ───────────────────────────────────────────
    cityStats: publicProcedure
      .input(z.object({ city: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return await getCityStats(input?.city);
      }),

    recentActivity: publicProcedure
      .input(z.object({ city: z.string().optional(), limit: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return await getRecentActivity(input?.city, input?.limit || 5);
      }),

    // ─── Protected: Admin Queries ───────────────────────────────────────
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
        // Re-score after status change
        const lead = await getLeadById(input.id);
        if (lead) {
          const scoring = calculateLeadScore(lead as any);
          await updateLeadScoring(input.id, {
            leadScore: scoring.score,
            estimatedJobValue: scoring.estimatedJobValue,
            closeProbability: scoring.closeProbability,
            expectedReturn: scoring.expectedReturn,
            scoreBreakdown: scoring.breakdown,
            nextAction: input.nextAction || scoring.nextAction,
            nextActionDue: scoring.nextActionDue,
          });
        }
        return { success: true };
      }),

    stats: protectedProcedure.query(async () => {
      return await getLeadStats();
    }),

    addNote: protectedProcedure
      .input(z.object({
        leadId: z.number(),
        content: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        await addLeadNote({
          leadId: input.leadId,
          content: input.content,
          authorName: ctx.user?.name || "Admin",
        });
        return { success: true };
      }),

    getNotes: protectedProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ input }) => {
        return await getLeadNotes(input.leadId);
      }),
  }),

  // ─── Completed Jobs (Jones Collateral) ──────────────────────────────────────
  completedJobs: router({
    list: protectedProcedure
      .input(z.object({ city: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return await getCompletedJobs(input?.city);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const job = await getCompletedJobById(input.id);
        if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
        return job;
      }),

    nearby: protectedProcedure
      .input(z.object({
        lat: z.number(),
        lng: z.number(),
        radiusMiles: z.number().default(1),
      }))
      .query(async ({ input }) => {
        return await getNearbyCompletedJobs(input.lat, input.lng, input.radiusMiles);
      }),

    create: protectedProcedure
      .input(z.object({
        address: z.string().min(5),
        city: z.string(),
        targetCity: z.enum(["naperville", "willow-springs", "sag-bridge", "palisades"]),
        lat: z.string().optional(),
        lng: z.string().optional(),
        jobType: z.string().default("Roof Replacement"),
        estimatedValue: z.number().optional(),
        completionDate: z.string().optional(),
        permissionLevel: z.enum(["full", "anonymous", "count_only"]).default("anonymous"),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await createCompletedJob({
          address: input.address,
          city: input.city,
          targetCity: input.targetCity,
          lat: input.lat || null,
          lng: input.lng || null,
          jobType: input.jobType,
          estimatedValue: input.estimatedValue || null,
          completionDate: input.completionDate ? new Date(input.completionDate) : null,
          permissionLevel: input.permissionLevel,
          notes: input.notes || null,
          beforePhotos: [],
          afterPhotos: [],
        });
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
