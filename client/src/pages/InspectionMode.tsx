import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle,
  Clock,
  CloudLightning,
  ExternalLink,
  Home,
  Loader2,
  MapPin,
  Phone,
  Shield,
  Users,
  Zap,
} from "lucide-react";
import { CITY_STORM_DATA, CLAIM_DEADLINE, type CitySlug } from "../../../shared/stormData";

const VALID_CITY_SLUGS: CitySlug[] = ["naperville", "willow-springs", "sag-bridge", "palisades"];
function isCitySlug(s: string): s is CitySlug {
  return VALID_CITY_SLUGS.includes(s as CitySlug);
}

type PresentationStep = "overview" | "storm" | "collateral" | "action";

export default function InspectionMode({ leadId }: { leadId: number }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState<PresentationStep>("overview");

  const { data: lead, isLoading } = trpc.leads.getById.useQuery(
    { id: leadId },
    { enabled: isAuthenticated && !!leadId }
  );

  // Get nearby completed jobs for Jones collateral
  const { data: nearbyJobs } = trpc.completedJobs.nearby.useQuery(
    {
      lat: lead?.lat ? Number(lead.lat) : 0,
      lng: lead?.lng ? Number(lead.lng) : 0,
      radiusMiles: 1,
    },
    { enabled: isAuthenticated && !!lead?.lat && !!lead?.lng }
  );

  // Get all completed jobs for the city as fallback
  const { data: cityJobs } = trpc.completedJobs.list.useQuery(
    { city: lead?.targetCity },
    { enabled: isAuthenticated && !!lead?.targetCity }
  );

  const collateral = nearbyJobs && nearbyJobs.length > 0 ? nearbyJobs : cityJobs || [];

  const daysUntilDeadline = useMemo(
    () => Math.ceil((new Date("2027-03-10").getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    []
  );

  const cityData = lead?.targetCity && isCitySlug(lead.targetCity)
    ? CITY_STORM_DATA[lead.targetCity]
    : null;

  // Cache data for offline use
  useEffect(() => {
    if (lead && cityData) {
      try {
        const cacheKey = `visualize_inspection_${leadId}`;
        const cacheData = {
          lead,
          cityData,
          collateral,
          cachedAt: Date.now(),
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      } catch {
        // localStorage full or unavailable — silent fail
      }
    }
  }, [lead, cityData, collateral, leadId]);

  const steps: { key: PresentationStep; label: string; icon: typeof CloudLightning }[] = [
    { key: "overview", label: "Property", icon: Home },
    { key: "storm", label: "Storm Data", icon: CloudLightning },
    { key: "collateral", label: "Neighbors", icon: Users },
    { key: "action", label: "Next Steps", icon: CheckCircle },
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-black">
        <div className="text-center max-w-md">
          <h1 className="font-display text-2xl font-bold text-white mb-3">Sign In Required</h1>
          <a href={getLoginUrl()}>
            <Button className="bg-white text-black">Sign In</Button>
          </a>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <p className="text-white/60">Lead not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ── Presentation Header ──────────────────────────────────────────── */}
      <header className="bg-black/90 backdrop-blur border-b border-white/10 py-3 px-4 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href={`/dashboard/leads/${leadId}`}>
            <span className="text-white/50 text-sm hover:text-white cursor-pointer transition-colors flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Exit
            </span>
          </Link>
          <div className="flex items-center gap-1">
            {steps.map((s, i) => (
              <button
                key={s.key}
                onClick={() => setCurrentStep(s.key)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  currentStep === s.key
                    ? "bg-white text-black"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                <s.icon className="w-3 h-3" />
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            ))}
          </div>
          <div className="text-right">
            <p className="text-[10px] text-red-400 font-bold">{daysUntilDeadline} DAYS LEFT</p>
          </div>
        </div>
      </header>

      {/* ── Content Area ─────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* ── STEP: Property Overview ──────────────────────────────────────── */}
        {currentStep === "overview" && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="text-center mb-8">
              <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Property Assessment</p>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">
                {lead.firstName} {lead.lastName}
              </h1>
              <p className="text-white/60 flex items-center justify-center gap-2">
                <MapPin className="w-4 h-4" /> {lead.address}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
                <p className="text-white/40 text-xs uppercase mb-1">Storm Event</p>
                <p className="font-display text-xl font-bold text-white">March 10, 2026</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
                <p className="text-white/40 text-xs uppercase mb-1">Hail Size Confirmed</p>
                <p className="font-display text-xl font-bold text-amber-400">
                  {lead.hailSizeConfirmed || cityData?.hailSize || "1.00\"–2.00\""}
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
                <p className="text-white/40 text-xs uppercase mb-1">Address Verified</p>
                <p className="font-display text-xl font-bold text-green-400">
                  {lead.addressVerified ? "In Hail Path" : "Pending"}
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
                <p className="text-white/40 text-xs uppercase mb-1">Claim Deadline</p>
                <p className="font-display text-xl font-bold text-red-400">{CLAIM_DEADLINE}</p>
              </div>
            </div>

            {lead.stormConfirmationMsg && (
              <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-200 leading-relaxed">{lead.stormConfirmationMsg}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <p className="text-white/40 text-xs uppercase mb-1">Claim Filed</p>
                <p className="text-lg font-bold text-white capitalize">{lead.claimFiled}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <p className="text-white/40 text-xs uppercase mb-1">Contractor Selected</p>
                <p className="text-lg font-bold text-white capitalize">{lead.contractorSelected}</p>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={() => setCurrentStep("storm")}
                className="bg-white text-black font-bold px-6 py-3 hover:bg-white/90"
              >
                View Storm Data <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP: Storm Evidence ─────────────────────────────────────────── */}
        {currentStep === "storm" && cityData && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="text-center mb-8">
              <p className="text-white/40 text-xs uppercase tracking-widest mb-2">NWS Verified Evidence</p>
              <h2 className="font-display text-3xl font-bold text-white mb-2">
                March 10, 2026 Storm — {cityData.name}
              </h2>
              <p className="text-white/50 text-sm">
                Source: National Weather Service Chicago
              </p>
            </div>

            {/* Hail Size Visual */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 mx-auto mb-4 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <span className="font-display text-3xl font-bold text-black">{cityData.hailSize}</span>
              </div>
              <p className="text-white/60 text-sm">Confirmed hail diameter</p>
              <p className="text-amber-400 text-xs mt-1">{cityData.hailComparison}</p>
            </div>

            {/* Storm Timeline */}
            <div className="space-y-4">
              <h3 className="font-display text-lg font-bold text-white">Storm Timeline</h3>
              {cityData.stormTimeline.map((event, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="w-16 flex-shrink-0 text-right">
                    <p className="text-xs font-mono text-amber-400">{event.time}</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">{event.event}</p>
                    <p className="text-xs text-white/50">{event.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* NWS Quote */}
            {cityData.nwsQuote && (
              <blockquote className="border-l-2 border-amber-400 pl-4 py-2">
                <p className="text-sm text-white/70 italic">"{cityData.nwsQuote}"</p>
                <p className="text-xs text-white/40 mt-1">— NWS Chicago</p>
              </blockquote>
            )}

            {/* Key Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
                <p className="font-display text-2xl font-bold text-white">{cityData.affectedProperties}</p>
                <p className="text-white/40 text-xs">Properties Impacted</p>
              </div>
              <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-5 text-center">
                <p className="font-display text-2xl font-bold text-red-400">{daysUntilDeadline}</p>
                <p className="text-red-300/60 text-xs">Days Until Claim Deadline</p>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStep("overview")}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Property
              </Button>
              <Button
                onClick={() => setCurrentStep("collateral")}
                className="bg-white text-black font-bold px-6 py-3 hover:bg-white/90"
              >
                Neighbor Activity <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP: Jones Collateral (Neighbor Activity) ───────────────────── */}
        {currentStep === "collateral" && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="text-center mb-8">
              <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Your Neighbors Are Acting</p>
              <h2 className="font-display text-3xl font-bold text-white mb-2">
                Nearby Restorations
              </h2>
              <p className="text-white/50 text-sm">
                Homes near {lead.address.split(",")[0]} that have already completed storm restoration
              </p>
            </div>

            {collateral.length > 0 ? (
              <div className="space-y-4">
                {collateral.map((job, i) => (
                  <div key={job.id || i} className="bg-white/5 border border-white/10 rounded-xl p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <p className="text-sm font-medium text-white">
                            {job.permissionLevel === "full"
                              ? job.address
                              : `A home on ${job.address.split(",")[0]?.split(" ").slice(1).join(" ") || job.city}`}
                          </p>
                        </div>
                        <p className="text-xs text-white/40 ml-6">{job.jobType}</p>
                        {job.completionDate && (
                          <p className="text-xs text-white/40 ml-6">
                            Completed: {new Date(job.completionDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        )}
                      </div>
                      {job.estimatedValue && (
                        <Badge className="bg-green-900/50 text-green-300 text-xs">
                          ${job.estimatedValue.toLocaleString()}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}

                <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-5 text-center">
                  <p className="font-display text-3xl font-bold text-amber-400">{collateral.length}</p>
                  <p className="text-amber-200/60 text-sm mt-1">
                    {collateral.length === 1 ? "neighbor has" : "neighbors have"} already completed restoration near you
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
                <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/60 text-sm mb-2">
                  No completed restorations logged nearby yet.
                </p>
                <p className="text-white/40 text-xs">
                  As you complete jobs, they'll appear here as social proof for future inspections.
                </p>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStep("storm")}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Storm Data
              </Button>
              <Button
                onClick={() => setCurrentStep("action")}
                className="bg-white text-black font-bold px-6 py-3 hover:bg-white/90"
              >
                Next Steps <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP: Next Steps / Close ─────────────────────────────────────── */}
        {currentStep === "action" && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="text-center mb-8">
              <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Recommended Action</p>
              <h2 className="font-display text-3xl font-bold text-white mb-2">
                Here's What Happens Next
              </h2>
            </div>

            <div className="space-y-4">
              {[
                {
                  step: 1,
                  title: "Free Professional Inspection",
                  desc: "We document every hail impact on your roof, siding, gutters, and windows with photos and measurements.",
                  icon: Camera,
                  active: true,
                },
                {
                  step: 2,
                  title: "Insurance Claim Assistance",
                  desc: "We prepare a detailed damage report and help you file your claim correctly — maximizing your coverage.",
                  icon: Shield,
                  active: false,
                },
                {
                  step: 3,
                  title: "Restoration & Repair",
                  desc: "Licensed, insured contractors complete the work. We coordinate everything with your insurance adjuster.",
                  icon: Home,
                  active: false,
                },
              ].map(({ step, title, desc, icon: Icon, active }) => (
                <div
                  key={step}
                  className={`rounded-xl p-5 border ${
                    active
                      ? "bg-amber-900/20 border-amber-500/30"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      active ? "bg-amber-500 text-black" : "bg-white/10 text-white/40"
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-white/40 uppercase mb-0.5">Step {step}</p>
                      <h3 className={`font-display text-lg font-bold ${active ? "text-amber-400" : "text-white"}`}>
                        {title}
                      </h3>
                      <p className="text-sm text-white/60 mt-1">{desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Urgency Block */}
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-5 text-center">
              <Clock className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="font-display text-lg font-bold text-red-400 mb-1">
                Claim Deadline: {CLAIM_DEADLINE}
              </p>
              <p className="text-sm text-red-200/60">
                {daysUntilDeadline} days remaining to file your insurance claim for storm damage coverage.
              </p>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: "Free Inspection", sub: "No cost, no obligation" },
                { label: "Licensed & Insured", sub: "Full coverage" },
                { label: "Insurance Experts", sub: "Claim assistance" },
              ].map(({ label, sub }) => (
                <div key={label} className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <Shield className="w-5 h-5 text-green-400 mx-auto mb-1" />
                  <p className="text-xs font-medium text-white">{label}</p>
                  <p className="text-[10px] text-white/40">{sub}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStep("collateral")}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Neighbors
              </Button>
              <Link href={`/dashboard/leads/${leadId}`}>
                <Button className="bg-green-600 text-white font-bold px-6 py-3 hover:bg-green-700">
                  <CheckCircle className="w-4 h-4 mr-2" /> Back to Lead
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
