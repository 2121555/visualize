import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";
import {
  ArrowRight,
  BarChart3,
  Clock,
  DollarSign,
  ExternalLink,
  Filter,
  Loader2,
  MapPin,
  Phone,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useState, useMemo } from "react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-blue-100 text-blue-800" },
  contacted: { label: "Contacted", color: "bg-yellow-100 text-yellow-800" },
  appointment_set: { label: "Appt Set", color: "bg-purple-100 text-purple-800" },
  inspected: { label: "Inspected", color: "bg-indigo-100 text-indigo-800" },
  contracted: { label: "Contracted", color: "bg-green-100 text-green-800" },
  lost: { label: "Lost", color: "bg-gray-100 text-gray-800" },
};

const CITY_LABELS: Record<string, string> = {
  naperville: "Naperville",
  "willow-springs": "Willow Springs",
  "sag-bridge": "Sag Bridge",
  palisades: "Palisades",
};

function formatCurrency(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return `$${n}`;
}

function getTierBadge(expectedReturn: number | null, leadScore: number | null) {
  const er = expectedReturn || 0;
  const score = leadScore || 0;
  if (er >= 200 || score >= 70) return { label: "HIGH RETURN", color: "bg-red-500 text-white", icon: Zap };
  if (er >= 80 || score >= 40) return { label: "MODERATE", color: "bg-amber-500 text-white", icon: TrendingUp };
  return { label: "DEVELOPING", color: "bg-blue-400 text-white", icon: Target };
}

export default function Dashboard() {
  const { user, loading, isAuthenticated } = useAuth();
  const [cityFilter, setCityFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<"expectedReturn" | "leadScore" | "createdAt">("expectedReturn");

  const { data: leads, isLoading: leadsLoading } = trpc.leads.list.useQuery(
    { city: cityFilter || undefined, status: statusFilter || undefined },
    { enabled: isAuthenticated }
  );

  const { data: stats } = trpc.leads.stats.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const daysUntilDeadline = useMemo(
    () => Math.ceil((new Date("2027-03-10").getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    []
  );

  const sortedLeads = useMemo(() => {
    if (!leads) return [];
    return [...leads].sort((a, b) => {
      if (sortBy === "expectedReturn") return (b.expectedReturn || 0) - (a.expectedReturn || 0);
      if (sortBy === "leadScore") return (b.leadScore || 0) - (a.leadScore || 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [leads, sortBy]);

  // Top action: highest expected return lead that needs action
  const topAction = useMemo(() => {
    if (!leads) return null;
    return leads.find(l => l.status !== "contracted" && l.status !== "lost" && l.nextAction) || null;
  }, [leads]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="font-display text-2xl font-bold text-foreground mb-3">Admin Access Required</h1>
          <p className="text-muted-foreground mb-6">Sign in to access the lead management dashboard.</p>
          <a href={getLoginUrl()}>
            <Button className="bg-primary text-primary-foreground">Sign In</Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="bg-storm-gradient text-white py-4 px-4">
        <div className="container flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold">Visualize Command</h1>
            <p className="text-white/60 text-xs">Chief of Staff · {user?.name || "Admin"}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/">
              <span className="text-white/70 text-sm hover:text-white cursor-pointer transition-colors">
                <ExternalLink className="w-4 h-4 inline mr-1" />View Site
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Top Action Briefing ──────────────────────────────────────────── */}
      {topAction && (
        <section className="bg-amber-50 border-b border-amber-200 py-3 px-4">
          <div className="container">
            <Link href={`/dashboard/leads/${topAction.id}`}>
              <div className="flex items-center gap-3 cursor-pointer group">
                <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-amber-900 uppercase tracking-wide">Next Highest-Return Action</p>
                  <p className="text-sm text-amber-800 truncate">
                    {topAction.firstName} {topAction.lastName} — {topAction.nextAction}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-amber-900">{formatCurrency(topAction.expectedReturn || 0)}/hr</p>
                  <p className="text-[10px] text-amber-700">Expected Return</p>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-600 group-hover:text-amber-900 transition-colors flex-shrink-0" />
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <section className="py-6 px-4 bg-white border-b border-border">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: "Pipeline Value", value: formatCurrency(stats?.totalPipelineValue || 0), icon: DollarSign, color: "text-green-600" },
              { label: "Avg Return/Hr", value: formatCurrency(stats?.avgExpectedReturn || 0), icon: TrendingUp, color: "text-primary" },
              { label: "Total Leads", value: String(stats?.total || 0), icon: Users, color: "text-blue-600" },
              { label: "New", value: String(stats?.new || 0), icon: Zap, color: "text-blue-500" },
              { label: "Appointments", value: String(stats?.appointment_set || 0), icon: Clock, color: "text-purple-600" },
              { label: "Contracted", value: String(stats?.contracted || 0), icon: BarChart3, color: "text-green-600" },
              { label: "Days Left", value: String(daysUntilDeadline), icon: Clock, color: "text-red-600" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-muted/30 rounded-lg p-3 text-center">
                <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
                <p className="font-display text-xl font-bold text-foreground">{value}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Filters & Sort ───────────────────────────────────────────────── */}
      <section className="py-3 px-4 bg-white border-b border-border">
        <div className="container flex flex-wrap items-center gap-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="text-sm border border-border rounded-md px-3 py-1.5 bg-white"
          >
            <option value="">All Cities</option>
            <option value="naperville">Naperville</option>
            <option value="willow-springs">Willow Springs</option>
            <option value="sag-bridge">Sag Bridge</option>
            <option value="palisades">Palisades</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-border rounded-md px-3 py-1.5 bg-white"
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="appointment_set">Appointment Set</option>
            <option value="inspected">Inspected</option>
            <option value="contracted">Contracted</option>
            <option value="lost">Lost</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="text-sm border border-border rounded-md px-3 py-1.5 bg-white"
          >
            <option value="expectedReturn">Sort: Highest Return</option>
            <option value="leadScore">Sort: Lead Score</option>
            <option value="createdAt">Sort: Newest</option>
          </select>
          <span className="text-xs text-muted-foreground ml-auto">
            {sortedLeads.length} leads
          </span>
        </div>
      </section>

      {/* ── Lead List ────────────────────────────────────────────────────── */}
      <section className="py-6 px-4">
        <div className="container">
          {leadsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : sortedLeads.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="font-display text-lg font-bold text-foreground mb-2">No Leads Yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Leads will appear here as homeowners submit the inspection form.
              </p>
              <Link href="/">
                <Button variant="outline" size="sm">View Landing Pages</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedLeads.map((lead) => {
                const tier = getTierBadge(lead.expectedReturn, lead.leadScore);
                const TierIcon = tier.icon;
                return (
                  <Link key={lead.id} href={`/dashboard/leads/${lead.id}`}>
                    <div className="bg-white border border-border rounded-lg p-4 card-hover cursor-pointer group">
                      <div className="flex items-start justify-between gap-3">
                        {/* Left: Lead Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-foreground text-sm">
                              {lead.firstName} {lead.lastName}
                            </h3>
                            <Badge className={`text-[10px] px-1.5 py-0 ${STATUS_LABELS[lead.status]?.color || ""}`}>
                              {STATUS_LABELS[lead.status]?.label || lead.status}
                            </Badge>
                            <Badge className={`text-[10px] px-1.5 py-0 ${tier.color}`}>
                              <TierIcon className="w-2.5 h-2.5 mr-0.5 inline" />
                              {tier.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{lead.address}</span>
                            <span className="flex-shrink-0">· {CITY_LABELS[lead.targetCity] || lead.targetCity}</span>
                          </div>
                          {lead.nextAction && (
                            <p className="text-xs text-primary mt-1 truncate flex items-center gap-1">
                              <ArrowRight className="w-3 h-3 flex-shrink-0" />
                              {lead.nextAction}
                            </p>
                          )}
                        </div>

                        {/* Right: ROI Metrics */}
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="text-center hidden sm:block">
                            <p className="text-xs text-muted-foreground">Job Value</p>
                            <p className="font-display text-sm font-bold text-foreground">
                              {formatCurrency(lead.estimatedJobValue || 0)}
                            </p>
                          </div>
                          <div className="text-center hidden md:block">
                            <p className="text-xs text-muted-foreground">Close %</p>
                            <p className="font-display text-sm font-bold text-foreground">
                              {Math.round(Number(lead.closeProbability || 0) * 100)}%
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Return/Hr</p>
                            <p className="font-display text-sm font-bold text-green-600">
                              {formatCurrency(lead.expectedReturn || 0)}
                            </p>
                          </div>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                            (lead.leadScore || 0) >= 70 ? "bg-red-500" :
                            (lead.leadScore || 0) >= 40 ? "bg-amber-500" :
                            (lead.leadScore || 0) >= 20 ? "bg-blue-500" : "bg-gray-400"
                          }`}>
                            {lead.leadScore || 0}
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
