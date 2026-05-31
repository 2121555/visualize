import { Link } from "wouter";
import { AlertTriangle, ArrowRight, CheckCircle, Clock, ExternalLink, MapPin, Shield } from "lucide-react";
import { CITY_STORM_DATA, CLAIM_DEADLINE, NWS_SOURCE_URL, STORM_EVENT_DATE } from "../../../shared/stormData";

const cities = Object.values(CITY_STORM_DATA);

export default function Home() {
  const daysUntilDeadline = Math.ceil(
    (new Date("2027-03-10").getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top Urgency Bar ─────────────────────────────────────────────── */}
      <div className="bg-destructive text-destructive-foreground py-2 px-4">
        <div className="container flex items-center justify-center gap-2 text-sm font-medium">
          <Clock className="w-4 h-4 urgency-pulse" />
          <span>Insurance Claim Deadline: <strong>{CLAIM_DEADLINE}</strong> — {daysUntilDeadline} days remaining</span>
        </div>
      </div>

      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <section className="bg-storm-gradient text-white py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"
        }} />
        <div className="container relative z-10 text-center stagger-children">
          <div className="badge-verified mb-6 mx-auto w-fit" style={{ background: 'oklch(0.52 0.18 145 / 0.2)', color: 'oklch(0.85 0.12 145)', borderColor: 'oklch(0.52 0.18 145 / 0.4)' }}>
            <CheckCircle className="w-3.5 h-3.5" />
            <span>NWS Chicago Verified Storm Event</span>
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold mb-4 leading-tight">
            Did The March 10 Hail Storm<br />
            <span style={{ color: 'oklch(0.82 0.18 60)' }}>Damage Your Roof?</span>
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-8">
            The National Weather Service confirmed hail up to 1.5" across Naperville, Willow Springs, Sag Bridge, and Palisades on March 10, 2026. Most damage is invisible from the ground — and your insurance claim window closes in <strong className="text-white">{daysUntilDeadline} days</strong>.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="#cities"
              className="inline-flex items-center gap-2 bg-cta-gradient text-foreground font-semibold px-8 py-4 rounded-lg text-lg hover:opacity-90 transition-opacity card-hover"
            >
              Find Your City <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href={NWS_SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-white/30 text-white/90 font-medium px-6 py-4 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View NWS Storm Report
            </a>
          </div>
        </div>
      </section>

      {/* ── Trust Bar ────────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-border py-6 px-4">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { icon: Shield, label: "NWS Verified", sub: "Official storm data" },
              { icon: CheckCircle, label: "Free Inspection", sub: "No obligation" },
              { icon: MapPin, label: "Local Contractor", sub: "Illinois licensed" },
              { icon: Clock, label: "Claim Deadline", sub: CLAIM_DEADLINE },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <Icon className="w-6 h-6 text-primary mb-1" />
                <span className="font-semibold text-sm text-foreground">{label}</span>
                <span className="text-xs text-muted-foreground">{sub}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── City Cards ───────────────────────────────────────────────────── */}
      <section id="cities" className="py-16 px-4 bg-background">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
              Select Your Community
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Each city page shows the verified NWS storm data specific to your area, including confirmed hail sizes and the number of affected properties.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
            {cities.map((city) => (
              <Link key={city.slug} href={`/${city.slug}`}>
                <div className="bg-card border border-border rounded-xl p-6 card-hover cursor-pointer group">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-display text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                        {city.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{city.county} County, IL</p>
                    </div>
                    <div className="hail-circle w-12 h-12 text-xs font-bold flex-shrink-0">
                      {city.hailSizeInches}"
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span className="text-foreground">{city.hailComparison} Hail</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-foreground">~{city.affectedProperties} properties impacted</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-destructive flex-shrink-0" />
                      <span className="text-destructive font-medium">Deadline: {CLAIM_DEADLINE}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-primary font-semibold text-sm group-hover:gap-2 transition-all">
                    View Storm Report <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── NWS Evidence Banner ──────────────────────────────────────────── */}
      <section className="py-12 px-4 bg-muted/50">
        <div className="container">
          <div className="bg-white border border-border rounded-xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
              </div>
              <div className="flex-1">
                <div className="badge-verified mb-3">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Official Government Source</span>
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mb-2">
                  National Weather Service — March 10, 2026 Severe Weather Summary
                </h3>
                <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                  "During the afternoon and evening of March 10, 2026, several intense supercell thunderstorms moved across northern Illinois... Another supercell moved across the southern and western Chicago metropolitan area and dropped hail ranging in size from 2 to locally 4 inches in diameter across Bolingbrook, Woodridge, Downers Grove, Westmont, and Darien."
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href={NWS_SOURCE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary font-medium text-sm hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    weather.gov/lot/2026_03_10_Severe_Weather
                  </a>
                  <span className="text-muted-foreground text-sm">· Retrieved {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Urgency CTA ──────────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-storm-gradient text-white">
        <div className="container text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 urgency-pulse" style={{ color: 'oklch(0.82 0.18 60)' }} />
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">
            Don't Miss Your Claim Window
          </h2>
          <p className="text-white/80 text-lg max-w-xl mx-auto mb-8">
            Hail damage is often invisible from the ground. A free professional inspection documents your damage before your insurance deadline expires.
          </p>
          <Link href="/get-inspection">
            <span className="inline-flex items-center gap-2 bg-cta-gradient text-foreground font-bold px-10 py-4 rounded-lg text-lg hover:opacity-90 transition-opacity card-hover cursor-pointer">
              Get My Free Inspection <ArrowRight className="w-5 h-5" />
            </span>
          </Link>
          <p className="text-white/50 text-sm mt-4">No obligation. No pressure. Local Illinois contractor.</p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-foreground text-background/70 py-8 px-4">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <p className="font-display font-bold text-background text-lg">Visualize Storm Restoration</p>
              <p className="text-sm">Serving Naperville, Willow Springs, Sag Bridge & Palisades, IL</p>
            </div>
            <div className="text-sm text-center md:text-right">
              <p>Storm data sourced from <a href={NWS_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="text-background underline">NWS Chicago</a></p>
              <p className="mt-1">Insurance claim deadline: <strong className="text-background">{CLAIM_DEADLINE}</strong></p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
