import { useState, useMemo, useEffect, useRef } from "react";
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
  Image,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Shield,
  Trash2,
  Upload,
  Users,
  Zap,
} from "lucide-react";
import { CITY_STORM_DATA, CLAIM_DEADLINE, type CitySlug } from "../../../shared/stormData";
import { precacheInspection } from "@/hooks/useServiceWorker";

const VALID_CITY_SLUGS: CitySlug[] = ["naperville", "willow-springs", "sag-bridge", "palisades"];
function isCitySlug(s: string): s is CitySlug {
  return VALID_CITY_SLUGS.includes(s as CitySlug);
}

type PresentationStep = "overview" | "storm" | "photos" | "collateral" | "action";

interface CapturedPhoto {
  id: string;
  file: File;
  preview: string;
  damageType: string;
  notes: string;
  uploaded: boolean;
  uploadedUrl?: string;
}

export default function InspectionMode({ leadId }: { leadId: number }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState<PresentationStep>("overview");
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: lead, isLoading } = trpc.leads.getById.useQuery(
    { id: leadId },
    { enabled: isAuthenticated && !!leadId }
  );

  const uploadPhoto = trpc.leads.uploadInspectionPhoto.useMutation();

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

  // Cache data for offline use (localStorage + Service Worker)
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

        // Pre-cache via Service Worker for true offline support
        const photoUrls = (collateral || []).flatMap((job: any) => [
          ...((job.beforePhotos as string[]) || []),
          ...((job.afterPhotos as string[]) || []),
        ]);
        precacheInspection(leadId, photoUrls);
      } catch {
        // localStorage full or unavailable
      }
    }
  }, [lead, cityData, collateral, leadId]);

  const steps: { key: PresentationStep; label: string; icon: typeof CloudLightning }[] = [
    { key: "overview", label: "Property", icon: Home },
    { key: "storm", label: "Storm", icon: CloudLightning },
    { key: "photos", label: "Photos", icon: Camera },
    { key: "collateral", label: "Neighbors", icon: Users },
    { key: "action", label: "Close", icon: CheckCircle },
  ];

  // Photo capture handlers
  const handleFileCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const preview = URL.createObjectURL(file);
      setPhotos((prev) => [
        ...prev,
        { id, file, preview, damageType: "Hail Impact", notes: "", uploaded: false },
      ]);
    });
    e.target.value = "";
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === id);
      if (photo) URL.revokeObjectURL(photo.preview);
      return prev.filter((p) => p.id !== id);
    });
  };

  const updatePhotoMeta = (id: string, field: "damageType" | "notes", value: string) => {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const uploadAllPhotos = async () => {
    setIsUploading(true);
    const pending = photos.filter((p) => !p.uploaded);
    for (const photo of pending) {
      try {
        const base64 = await fileToBase64(photo.file);
        const result = await uploadPhoto.mutateAsync({
          leadId,
          base64Data: base64,
          fileName: photo.file.name,
          mimeType: photo.file.type || "image/jpeg",
          damageType: photo.damageType,
          notes: photo.notes,
        });
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === photo.id ? { ...p, uploaded: true, uploadedUrl: result.url } : p
          )
        );
      } catch (err) {
        console.error("Upload failed for", photo.file.name, err);
      }
    }
    setIsUploading(false);
  };

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
            {steps.map((s) => (
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
              <p className="text-white/50 text-sm">Source: National Weather Service Chicago</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 mx-auto mb-4 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <span className="font-display text-3xl font-bold text-black">{cityData.hailSize}</span>
              </div>
              <p className="text-white/60 text-sm">Confirmed hail diameter</p>
              <p className="text-amber-400 text-xs mt-1">{cityData.hailComparison}</p>
            </div>

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

            {cityData.nwsQuote && (
              <blockquote className="border-l-2 border-amber-400 pl-4 py-2">
                <p className="text-sm text-white/70 italic">"{cityData.nwsQuote}"</p>
                <p className="text-xs text-white/40 mt-1">— NWS Chicago</p>
              </blockquote>
            )}

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
              <Button variant="outline" onClick={() => setCurrentStep("overview")} className="border-white/20 text-white hover:bg-white/10">
                <ArrowLeft className="w-4 h-4 mr-2" /> Property
              </Button>
              <Button onClick={() => setCurrentStep("photos")} className="bg-white text-black font-bold px-6 py-3 hover:bg-white/90">
                Capture Photos <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP: Photo Capture ─────────────────────────────────────────── */}
        {currentStep === "photos" && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="text-center mb-8">
              <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Document Damage</p>
              <h2 className="font-display text-3xl font-bold text-white mb-2">
                Capture Inspection Photos
              </h2>
              <p className="text-white/50 text-sm">
                Take photos of hail damage on roof, siding, gutters, and windows
              </p>
            </div>

            {/* Camera Capture Button */}
            <div className="flex flex-col items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handleFileCapture}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-32 h-32 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30 active:scale-95 transition-transform"
              >
                <Camera className="w-12 h-12 text-black" />
              </button>
              <p className="text-white/50 text-sm">Tap to capture or select photos</p>
            </div>

            {/* Photo Gallery */}
            {photos.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold text-white">
                    {photos.length} {photos.length === 1 ? "Photo" : "Photos"} Captured
                  </h3>
                  <Badge className="bg-green-900/50 text-green-300">
                    {photos.filter((p) => p.uploaded).length} uploaded
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                      <img
                        src={photo.preview}
                        alt={photo.damageType}
                        className="w-full h-32 object-cover"
                      />
                      {photo.uploaded && (
                        <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                          <CheckCircle className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <div className="p-2 space-y-1">
                        <select
                          value={photo.damageType}
                          onChange={(e) => updatePhotoMeta(photo.id, "damageType", e.target.value)}
                          className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-xs text-white"
                        >
                          <option value="Hail Impact">Hail Impact</option>
                          <option value="Granule Loss">Granule Loss</option>
                          <option value="Cracked Shingle">Cracked Shingle</option>
                          <option value="Dented Vent">Dented Vent</option>
                          <option value="Gutter Damage">Gutter Damage</option>
                          <option value="Siding Damage">Siding Damage</option>
                          <option value="Window Damage">Window Damage</option>
                          <option value="Other">Other</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Notes..."
                          value={photo.notes}
                          onChange={(e) => updatePhotoMeta(photo.id, "notes", e.target.value)}
                          className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-xs text-white placeholder:text-white/30"
                        />
                      </div>
                      <button
                        onClick={() => removePhoto(photo.id)}
                        className="absolute top-2 left-2 bg-red-500/80 rounded-full p-1 hover:bg-red-500"
                      >
                        <Trash2 className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Upload Button */}
                {photos.some((p) => !p.uploaded) && (
                  <Button
                    onClick={uploadAllPhotos}
                    disabled={isUploading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3"
                  >
                    {isUploading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                    ) : (
                      <><Upload className="w-4 h-4 mr-2" /> Upload {photos.filter((p) => !p.uploaded).length} Photos</>
                    )}
                  </Button>
                )}
              </div>
            )}

            {photos.length === 0 && (
              <div className="bg-white/5 border border-white/10 border-dashed rounded-xl p-8 text-center">
                <Image className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/50 text-sm">No photos captured yet</p>
                <p className="text-white/30 text-xs mt-1">
                  Use the camera button above to document roof, siding, and gutter damage
                </p>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setCurrentStep("storm")} className="border-white/20 text-white hover:bg-white/10">
                <ArrowLeft className="w-4 h-4 mr-2" /> Storm Data
              </Button>
              <Button onClick={() => setCurrentStep("collateral")} className="bg-white text-black font-bold px-6 py-3 hover:bg-white/90">
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
              <h2 className="font-display text-3xl font-bold text-white mb-2">Nearby Restorations</h2>
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
                    {/* Show before/after photos if available */}
                    {(job.afterPhotos as string[] || []).length > 0 && (
                      <div className="mt-3 flex gap-2 overflow-x-auto">
                        {(job.afterPhotos as string[]).slice(0, 3).map((url, pi) => (
                          <img key={pi} src={url} alt="Completed work" className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
                        ))}
                      </div>
                    )}
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
                <p className="text-white/60 text-sm mb-2">No completed restorations logged nearby yet.</p>
                <p className="text-white/40 text-xs">
                  As you complete jobs, they'll appear here as social proof for future inspections.
                </p>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setCurrentStep("photos")} className="border-white/20 text-white hover:bg-white/10">
                <ArrowLeft className="w-4 h-4 mr-2" /> Photos
              </Button>
              <Button onClick={() => setCurrentStep("action")} className="bg-white text-black font-bold px-6 py-3 hover:bg-white/90">
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
              <h2 className="font-display text-3xl font-bold text-white mb-2">Here's What Happens Next</h2>
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
                    active ? "bg-amber-900/20 border-amber-500/30" : "bg-white/5 border-white/10"
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
              <Button variant="outline" onClick={() => setCurrentStep("collateral")} className="border-white/20 text-white hover:bg-white/10">
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

// Utility: convert File to base64 string (without data URL prefix)
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data:image/...;base64, prefix
      const base64 = result.split(",")[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
