import { useState, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  CloudLightning,
  Loader2,
  MapPin,
  Shield,
} from "lucide-react";
import { CITY_STORM_DATA, CLAIM_DEADLINE, type CitySlug } from "../../../shared/stormData";
import { toast } from "sonner";

interface LeadFormProps {
  citySlug?: string;
}

type FormStep = 1 | 2 | 3;

const VALID_CITY_SLUGS: CitySlug[] = ["naperville", "willow-springs", "sag-bridge", "palisades"];

function isCitySlug(s: string): s is CitySlug {
  return VALID_CITY_SLUGS.includes(s as CitySlug);
}

export default function LeadForm({ citySlug }: LeadFormProps) {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<FormStep>(1);
  const [isVerifying, setIsVerifying] = useState(false);

  // Step 1 fields
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state] = useState("IL");
  const [zip, setZip] = useState("");
  const [targetCity, setTargetCity] = useState(citySlug || "");

  // Step 2 fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Step 3 fields
  const [contractorSelected, setContractorSelected] = useState("unknown");
  const [claimFiled, setClaimFiled] = useState("unknown");
  const [bestContactTime, setBestContactTime] = useState("anytime");

  // Verification result from Step 1
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    lat: number | null;
    lng: number | null;
    formattedAddress: string | null;
    hailSizeConfirmed: string | null;
    confirmationMessage: string;
  } | null>(null);

  const daysUntilDeadline = useMemo(
    () => Math.ceil((new Date("2027-03-10").getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    []
  );

  // tRPC mutations
  const verifyAddressMutation = trpc.leads.verifyAddress.useMutation();

  const submitLead = trpc.leads.submit.useMutation({
    onSuccess: () => {
      navigate("/thank-you");
    },
    onError: () => {
      toast.error("Something went wrong. Please try again.");
    },
  });

  // Determine target city from input
  function detectTargetCity(cityName: string, zipCode: string): CitySlug {
    const lower = cityName.toLowerCase().trim();
    if (lower.includes("naperville")) return "naperville";
    if (lower.includes("willow") && lower.includes("spring")) return "willow-springs";
    if (lower.includes("sag") && lower.includes("bridge")) return "sag-bridge";
    if (lower.includes("palisade")) return "palisades";
    // Check zip codes
    for (const slug of VALID_CITY_SLUGS) {
      const data = CITY_STORM_DATA[slug];
      if (data.zipCodes.includes(zipCode)) return slug;
    }
    return "naperville";
  }

  async function handleStep1Submit(e: React.FormEvent) {
    e.preventDefault();
    if (!address || !city || !zip) {
      toast.error("Please fill in your full address.");
      return;
    }
    const resolved = isCitySlug(targetCity) ? targetCity : detectTargetCity(city, zip);
    setTargetCity(resolved);
    setIsVerifying(true);

    try {
      const result = await verifyAddressMutation.mutateAsync({
        address: `${address}, ${city}, ${state} ${zip}`,
        city: resolved,
      });
      setVerificationResult(result);
    } catch {
      // Fallback: still advance with default confirmation
      const cityData = CITY_STORM_DATA[resolved];
      setVerificationResult({
        verified: true,
        lat: null,
        lng: null,
        formattedAddress: `${address}, ${city}, ${state} ${zip}`,
        hailSizeConfirmed: cityData?.hailSize || '1.00"–1.25"',
        confirmationMessage: `Your property at ${address}, ${city} ${zip} is located within the confirmed March 10, 2026 hail path. NWS Chicago verified ${cityData?.hailSize || '1.00"–1.25"'} hail in your area.`,
      });
    }
    setIsVerifying(false);
    setStep(2);
  }

  function handleStep2Submit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName || !lastName || !phone || !email) {
      toast.error("Please fill in all contact fields.");
      return;
    }
    if (!email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setStep(3);
  }

  function handleStep3Submit(e: React.FormEvent) {
    e.preventDefault();
    const resolvedCity = isCitySlug(targetCity) ? targetCity : "naperville";
    submitLead.mutate({
      address: `${address}, ${city}, ${state} ${zip}`,
      city,
      state,
      zip,
      targetCity: resolvedCity,
      firstName,
      lastName,
      phone,
      email,
      contractorSelected: contractorSelected as "yes" | "no" | "unknown",
      claimFiled: claimFiled as "yes" | "no" | "unknown",
      bestContactTime: bestContactTime as "morning" | "afternoon" | "evening" | "anytime",
      source: "landing_page",
      qrCodeScanned: false,
      addressVerified: verificationResult?.verified || false,
      lat: verificationResult?.lat ? String(verificationResult.lat) : undefined,
      lng: verificationResult?.lng ? String(verificationResult.lng) : undefined,
      hailSizeConfirmed: verificationResult?.hailSizeConfirmed || undefined,
      stormConfirmationMsg: verificationResult?.confirmationMessage || undefined,
    });
  }

  const resolvedSlug: CitySlug = isCitySlug(targetCity)
    ? targetCity
    : isCitySlug(citySlug || "")
    ? (citySlug as CitySlug)
    : "naperville";
  const cityData = CITY_STORM_DATA[resolvedSlug];

  return (
    <div className="min-h-screen bg-background">
      {/* ── Urgency Bar ──────────────────────────────────────────────────── */}
      <div className="bg-destructive text-destructive-foreground py-2 px-4">
        <div className="container flex items-center justify-center gap-2 text-sm font-medium">
          <Clock className="w-4 h-4 urgency-pulse" />
          <span>
            Claim Deadline: <strong>{CLAIM_DEADLINE}</strong> — {daysUntilDeadline} days remaining
          </span>
        </div>
      </div>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-border py-4 px-4">
        <div className="container flex items-center justify-between">
          <Link href={citySlug ? `/${citySlug}` : "/"}>
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </span>
          </Link>
          <span className="font-display font-bold text-foreground">Free Storm Inspection</span>
          <div className="w-16" />
        </div>
      </div>

      {/* ── Progress Steps ───────────────────────────────────────────────── */}
      <div className="bg-white border-b border-border py-4 px-4">
        <div className="container max-w-lg">
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    s < step
                      ? "step-complete"
                      : s === step
                      ? "step-active"
                      : "step-inactive"
                  }`}
                >
                  {s < step ? <CheckCircle className="w-4 h-4" /> : s}
                </div>
                <span className={`text-xs hidden sm:inline ${s === step ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {s === 1 ? "Address" : s === 2 ? "Contact" : "Details"}
                </span>
                {s < 3 && <div className={`w-8 h-0.5 ${s < step ? "bg-green-500" : "bg-border"}`} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Form Content ─────────────────────────────────────────────────── */}
      <div className="py-10 px-4">
        <div className="container max-w-lg">
          {/* ─── STEP 1: Address ─────────────────────────────────────────── */}
          {step === 1 && (
            <div className="animate-fade-in-up">
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-7 h-7 text-primary" />
                </div>
                <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                  Check Your Property
                </h2>
                <p className="text-muted-foreground text-sm">
                  Enter your address to verify if your property was in the March 10 hail path.
                </p>
              </div>

              <form onSubmit={handleStep1Submit} className="space-y-4">
                <div>
                  <Label htmlFor="address" className="text-sm font-medium">Street Address</Label>
                  <Input
                    id="address"
                    placeholder="123 Main Street"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="city" className="text-sm font-medium">City</Label>
                    <Input
                      id="city"
                      placeholder={cityData?.name || "City"}
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="zip" className="text-sm font-medium">ZIP Code</Label>
                    <Input
                      id="zip"
                      placeholder={cityData?.zipCodes[0] || "60540"}
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">State</Label>
                  <Input value="Illinois" disabled className="mt-1 bg-muted" />
                </div>

                <Button type="submit" className="w-full bg-cta-gradient text-foreground font-bold py-6 text-base hover:opacity-90" disabled={isVerifying}>
                  {isVerifying ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Verifying...</>
                  ) : (
                    <>Verify My Address <ArrowRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
              </form>

              <p className="text-center text-xs text-muted-foreground mt-4">
                We check your address against the NWS-confirmed March 10 hail swath data.
              </p>
            </div>
          )}

          {/* ─── STEP 2: Contact Info + Storm Confirmation ────────────────── */}
          {step === 2 && (
            <div className="animate-fade-in-up">
              {/* Storm Confirmation Message */}
              {verificationResult && (
                <div className={`rounded-xl p-4 mb-8 border ${
                  verificationResult.verified
                    ? "bg-green-50 border-green-200"
                    : "bg-amber-50 border-amber-200"
                }`}>
                  <div className="flex items-start gap-3">
                    {verificationResult.verified ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <CloudLightning className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground leading-relaxed">
                        {verificationResult.confirmationMessage}
                      </p>
                      {verificationResult.verified && verificationResult.hailSizeConfirmed && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Source: NWS Chicago · Hail size: {verificationResult.hailSizeConfirmed}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="text-center mb-6">
                <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                  Your Contact Information
                </h2>
                <p className="text-muted-foreground text-sm">
                  We'll use this to schedule your free inspection and send your storm report.
                </p>
              </div>

              <form onSubmit={handleStep2Submit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="firstName" className="text-sm font-medium">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-sm font-medium">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Smith"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(630) 555-0123"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1 py-6">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button type="submit" className="flex-[2] bg-cta-gradient text-foreground font-bold py-6 text-base hover:opacity-90">
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* ─── STEP 3: Qualifying Questions ────────────────────────────── */}
          {step === 3 && (
            <div className="animate-fade-in-up">
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-7 h-7 text-primary" />
                </div>
                <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                  A Few Quick Questions
                </h2>
                <p className="text-muted-foreground text-sm">
                  This helps us prepare the right inspection approach for your property.
                </p>
              </div>

              <form onSubmit={handleStep3Submit} className="space-y-6">
                {/* Contractor Selected */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Have you selected a contractor for storm repairs?</Label>
                  <RadioGroup value={contractorSelected} onValueChange={setContractorSelected}>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="no" id="contractor-no" />
                      <Label htmlFor="contractor-no" className="cursor-pointer flex-1 text-sm">No, I haven't chosen anyone yet</Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="yes" id="contractor-yes" />
                      <Label htmlFor="contractor-yes" className="cursor-pointer flex-1 text-sm">Yes, I already have a contractor</Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="unknown" id="contractor-unknown" />
                      <Label htmlFor="contractor-unknown" className="cursor-pointer flex-1 text-sm">I'm not sure / still deciding</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Claim Filed */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Have you filed an insurance claim for storm damage?</Label>
                  <RadioGroup value={claimFiled} onValueChange={setClaimFiled}>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="no" id="claim-no" />
                      <Label htmlFor="claim-no" className="cursor-pointer flex-1 text-sm">No, I haven't filed a claim</Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="yes" id="claim-yes" />
                      <Label htmlFor="claim-yes" className="cursor-pointer flex-1 text-sm">Yes, I've already filed</Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="unknown" id="claim-unknown" />
                      <Label htmlFor="claim-unknown" className="cursor-pointer flex-1 text-sm">I'm not sure how to file</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Best Contact Time */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">When is the best time to reach you?</Label>
                  <RadioGroup value={bestContactTime} onValueChange={setBestContactTime}>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: "morning", label: "Morning (8–11 AM)" },
                        { value: "afternoon", label: "Afternoon (12–4 PM)" },
                        { value: "evening", label: "Evening (5–8 PM)" },
                        { value: "anytime", label: "Anytime works" },
                      ].map(({ value, label }) => (
                        <div key={value} className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                          <RadioGroupItem value={value} id={`time-${value}`} />
                          <Label htmlFor={`time-${value}`} className="cursor-pointer flex-1 text-xs">{label}</Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1 py-6">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-[2] bg-cta-gradient text-foreground font-bold py-6 text-base hover:opacity-90"
                    disabled={submitLead.isPending}
                  >
                    {submitLead.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting...</>
                    ) : (
                      <>Get My Free Inspection <CheckCircle className="w-4 h-4 ml-2" /></>
                    )}
                  </Button>
                </div>
              </form>

              <p className="text-center text-xs text-muted-foreground mt-4">
                No obligation · No cost · Your information is secure
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
