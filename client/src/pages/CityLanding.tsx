import { Link } from "wouter";
import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  CloudLightning,
  ExternalLink,
  MapPin,
  Shield,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import {
  CITY_STORM_DATA,
  CLAIM_DEADLINE,
  HAIL_SIZE_DAMAGE_GUIDE,
  NWS_SOURCE_URL,
  STORM_EVENT_DATE,
  type CitySlug,
} from "../../../shared/stormData";

const VALID_CITY_SLUGS: CitySlug[] = ["naperville", "willow-springs", "sag-bridge", "palisades"];
function isCitySlug(s: string): s is CitySlug {
  return VALID_CITY_SLUGS.includes(s as CitySlug);
}

// ─── Social Proof Component ──────────────────────────────────────────────────
function SocialProofSection({ citySlug, cityName }: { citySlug: string; cityName: string }) {
  const cityInput = useMemo(() => ({ city: citySlug }), [citySlug]);
  const { data: stats } = trpc.leads.cityStats.useQuery(cityInput);
  const { data: activity } = trpc.leads.recentActivity.useQuery(cityInput);

  const totalActive = (stats?.inspectionsScheduled || 0) + (stats?.totalLeads || 0);

  // Only show if there's actual data
  if (!stats || totalActive === 0) {
    return (
      <section className="py-10 px-4 bg-amber-50 border-y border-amber-100">
        <div className="container max-w-3xl text-center">
          <Users className="w-8 h-8 text-amber-600 mx-auto mb-3" />
          <h3 className="font-display text-xl font-bold text-foreground mb-2">
            Your Neighbors Are Starting To Act
          </h3>
          <p className="text-muted-foreground text-sm">
            Homeowners in {cityName} are scheduling free inspections to document hail damage before the March 10, 2027 deadline. Be among the first to protect your property.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-10 px-4 bg-amber-50 border-y border-amber-100">
      <div className="container max-w-3xl">
        <div className="text-center mb-6">
          <h3 className="font-display text-xl font-bold text-foreground mb-1">
            Your {cityName} Neighbors Are Already Taking Action
          </h3>
          <p className="text-muted-foreground text-sm">
            Real-time activity from homeowners in your area since March 10
          </p>
        </div>

        {/* Stats counters */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-3 text-center border border-amber-200">
            <p className="font-display text-2xl font-bold text-foreground">{stats.totalLeads}</p>
            <p className="text-xs text-muted-foreground">Inspections Requested</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center border border-amber-200">
            <p className="font-display text-2xl font-bold text-foreground">{stats.inspectionsScheduled}</p>
            <p className="text-xs text-muted-foreground">Inspections Completed</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center border border-amber-200">
            <p className="font-display text-2xl font-bold text-green-600">{stats.restorationComplete}</p>
            <p className="text-xs text-muted-foreground">Restorations Done</p>
          </div>
        </div>

        {/* Recent activity feed */}
        {activity && activity.length > 0 && (
          <div className="space-y-2">
            {activity.map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-white rounded-lg px-4 py-2.5 border border-amber-100">
                <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 animate-pulse" />
                <p className="text-sm text-foreground flex-1">
                  A homeowner near <strong>{item.streetHint}</strong> {item.action}
                </p>
                <span className="text-xs text-muted-foreground flex-shrink-0">{item.timeAgo}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

interface CityLandingProps {
  citySlug: string;
}

export default function CityLanding({ citySlug }: CityLandingProps) {
  const validSlug: CitySlug = isCitySlug(citySlug) ? citySlug : "naperville";
  const city = CITY_STORM_DATA[validSlug];

  if (!city) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">City not found.</p>
      </div>
    );
  }

  const daysUntilDeadline = Math.ceil(
    (new Date("2027-03-10").getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="min-h-screen bg-background">
      {/* ── Urgency Bar ──────────────────────────────────────────────────── */}
      <div className="bg-destructive text-destructive-foreground py-2 px-4">
        <div className="container flex items-center justify-center gap-2 text-sm font-medium">
          <Clock className="w-4 h-4 urgency-pulse" />
          <span>
            Insurance Claim Deadline: <strong>{CLAIM_DEADLINE}</strong> —{" "}
            {daysUntilDeadline} days remaining
          </span>
        </div>
      </div>

      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <section className="bg-storm-gradient text-white py-16 md:py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff'%3E%3Ccircle cx='20' cy='20' r='3'/%3E%3C/g%3E%3C/svg%3E\")"
        }} />
        <div className="container relative z-10">
          <div className="max-w-3xl mx-auto text-center stagger-children">
            <div className="badge-verified mb-6 mx-auto w-fit" style={{ background: 'oklch(0.52 0.18 145 / 0.2)', color: 'oklch(0.85 0.12 145)', borderColor: 'oklch(0.52 0.18 145 / 0.4)' }}>
              <CheckCircle className="w-3.5 h-3.5" />
              <span>NWS Chicago Verified — {STORM_EVENT_DATE}</span>
            </div>

            <h1 className="font-display text-3xl md:text-5xl lg:text-6xl font-bold mb-5 leading-tight">
              {city.heroTagline}
            </h1>

            <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-4">
              The National Weather Service confirmed <strong className="text-white">{city.hailSize}</strong> hail
              ({city.hailComparison.toLowerCase()}) impacting approximately{" "}
              <strong className="text-white">{city.affectedProperties} properties</strong> in {city.name} on March 10, 2026.
            </p>

            <p className="text-white/60 text-sm mb-8">
              {city.county} County, Illinois · Storm window: {city.stormTime}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href={`/get-inspection/${citySlug}`}>
                <span className="inline-flex items-center gap-2 bg-cta-gradient text-foreground font-bold px-8 py-4 rounded-lg text-lg hover:opacity-90 transition-opacity card-hover cursor-pointer">
                  Check If My Property Was Affected <ArrowRight className="w-5 h-5" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Hail Size Visual ─────────────────────────────────────────────── */}
      <section className="py-12 px-4 bg-white border-b border-border">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8">
            <div className="text-center">
              <div className="hail-circle w-28 h-28 md:w-36 md:h-36 text-2xl md:text-3xl mx-auto mb-3">
                {city.hailSizeInches}"
              </div>
              <p className="font-display text-lg font-bold text-foreground">{city.hailComparison}</p>
              <p className="text-sm text-muted-foreground">Confirmed in {city.name}</p>
            </div>
            <div className="max-w-md text-left">
              <h3 className="font-display text-xl font-bold text-foreground mb-2">
                What {city.hailSizeInches}" Hail Does To A Roof
              </h3>
              <ul className="space-y-2">
                {HAIL_SIZE_DAMAGE_GUIDE
                  .filter(d => parseFloat(d.size) <= city.hailSizeInches)
                  .map(d => (
                    <li key={d.size} className="flex items-start gap-2 text-sm">
                      <Zap className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span><strong>{d.size} ({d.comparison}):</strong> {d.damage}</span>
                    </li>
                  ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-3">
                Most hail damage is invisible from the ground. A professional inspection is the only way to confirm.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Storm Timeline ───────────────────────────────────────────────── */}
      <section className="py-14 px-4 bg-background">
        <div className="container max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
              Storm Timeline — {city.name}, IL
            </h2>
            <p className="text-muted-foreground text-sm">
              March 10, 2026 · Source: NWS Chicago
            </p>
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 md:left-8 top-0 bottom-0 w-0.5 bg-border" />

            <div className="space-y-6 stagger-children">
              {city.stormTimeline.map((event, i) => (
                <div key={i} className="relative flex gap-4 md:gap-6">
                  <div className="relative z-10 flex-shrink-0">
                    <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center border-2 ${
                      i === city.stormTimeline.length - 2
                        ? "bg-destructive/10 border-destructive"
                        : "bg-primary/10 border-primary/30"
                    }`}>
                      <CloudLightning className={`w-5 h-5 md:w-6 md:h-6 ${
                        i === city.stormTimeline.length - 2 ? "text-destructive" : "text-primary"
                      }`} />
                    </div>
                  </div>
                  <div className="pt-2 md:pt-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-bold text-primary">{event.time}</span>
                      <span className="text-xs text-muted-foreground">CDT</span>
                    </div>
                    <h4 className="font-display text-base md:text-lg font-bold text-foreground">
                      {event.event}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-0.5">{event.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── NWS Evidence Block ───────────────────────────────────────────── */}
      <section className="py-12 px-4 bg-muted/50">
        <div className="container max-w-3xl">
          <div className="bg-white border border-border rounded-xl p-6 md:p-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="flex-1">
                <div className="badge-verified mb-3">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Official Government Source</span>
                </div>
                <blockquote className="text-foreground text-sm leading-relaxed italic border-l-4 border-primary/30 pl-4 mb-4">
                  "{city.nwsQuote}"
                </blockquote>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <a
                    href={city.nwsSourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary font-medium hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    NWS Chicago Storm Report
                  </a>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">
                    Retrieved {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">Event Date: March 10, 2026</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Key Facts Grid ───────────────────────────────────────────────── */}
      <section className="py-14 px-4 bg-background">
        <div className="container max-w-4xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: CloudLightning,
                label: "Confirmed Hail",
                value: city.hailSize,
                sub: city.hailComparison,
                bg: "bg-blue-50",
                iconColor: "text-blue-600",
              },
              {
                icon: MapPin,
                label: "Properties Impacted",
                value: `~${city.affectedProperties}`,
                sub: `In ${city.name}`,
                bg: "bg-purple-50",
                iconColor: "text-purple-600",
              },
              {
                icon: Clock,
                label: "Claim Deadline",
                value: CLAIM_DEADLINE,
                sub: `${daysUntilDeadline} days left`,
                bg: "bg-red-50",
                iconColor: "text-red-600",
              },
              {
                icon: Shield,
                label: "Free Inspection",
                value: "$0",
                sub: "No obligation",
                bg: "bg-green-50",
                iconColor: "text-green-600",
              },
            ].map(({ icon: Icon, label, value, sub, bg, iconColor }) => (
              <div key={label} className={`${bg} rounded-xl p-5 text-center card-hover`}>
                <Icon className={`w-6 h-6 ${iconColor} mx-auto mb-2`} />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
                <p className="font-display text-xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social Proof: Neighbor Activity ─────────────────────────────── */}
      <SocialProofSection citySlug={citySlug} cityName={city.name} />

      {/* ── Urgency Section ──────────────────────────────────────────────── */}
      <section className="py-14 px-4 bg-storm-gradient text-white">
        <div className="container max-w-2xl text-center">
          <AlertTriangle className="w-10 h-10 mx-auto mb-4 urgency-pulse" style={{ color: 'oklch(0.82 0.18 60)' }} />
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">
            Your Insurance Claim Window Is Closing
          </h2>
          <p className="text-white/80 mb-2">
            {city.urgencyNote}
          </p>
          <p className="text-white/60 text-sm mb-8">
            A free professional inspection documents your damage and gives you the evidence you need to file a successful claim — before your deadline expires.
          </p>
          <Link href={`/get-inspection/${citySlug}`}>
            <span className="inline-flex items-center gap-2 bg-cta-gradient text-foreground font-bold px-10 py-4 rounded-lg text-lg hover:opacity-90 transition-opacity card-hover cursor-pointer">
              Get My Free Inspection <ArrowRight className="w-5 h-5" />
            </span>
          </Link>
          <p className="text-white/40 text-xs mt-4">
            No obligation · No pressure · Local Illinois licensed contractor
          </p>
        </div>
      </section>

      {/* ── Trust Bar ────────────────────────────────────────────────────── */}
      <section className="py-8 px-4 bg-white border-t border-border">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { icon: Shield, label: "NWS Verified Data", sub: "Government source" },
              { icon: CheckCircle, label: "Free Inspection", sub: "Zero cost to you" },
              { icon: MapPin, label: "Local to " + city.name, sub: "Illinois licensed" },
              { icon: Clock, label: "Deadline: " + CLAIM_DEADLINE, sub: daysUntilDeadline + " days left" },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <Icon className="w-5 h-5 text-primary mb-1" />
                <span className="font-semibold text-xs text-foreground">{label}</span>
                <span className="text-xs text-muted-foreground">{sub}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-foreground text-background/70 py-8 px-4">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <Link href="/">
                <span className="font-display font-bold text-background text-lg cursor-pointer hover:opacity-80 transition-opacity">
                  Visualize Storm Restoration
                </span>
              </Link>
              <p className="text-sm mt-1">Serving {city.name}, {city.county} County, IL</p>
            </div>
            <div className="text-sm text-center md:text-right">
              <p>
                Storm data:{" "}
                <a href={NWS_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="text-background underline">
                  NWS Chicago
                </a>{" "}
                · Retrieved {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
              <p className="mt-1">
                Claim deadline: <strong className="text-background">{CLAIM_DEADLINE}</strong>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
