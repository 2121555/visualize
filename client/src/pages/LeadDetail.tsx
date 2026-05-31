import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Shield,
  User,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface LeadDetailProps {
  leadId: number;
}

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "appointment_set", label: "Appointment Set" },
  { value: "inspected", label: "Inspected" },
  { value: "contracted", label: "Contracted" },
  { value: "lost", label: "Lost" },
];

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-yellow-100 text-yellow-800",
  appointment_set: "bg-purple-100 text-purple-800",
  inspected: "bg-indigo-100 text-indigo-800",
  contracted: "bg-green-100 text-green-800",
  lost: "bg-gray-100 text-gray-800",
};

export default function LeadDetail({ leadId }: LeadDetailProps) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [noteText, setNoteText] = useState("");

  const { data: lead, isLoading, refetch } = trpc.leads.getById.useQuery(
    { id: leadId },
    { enabled: isAuthenticated && leadId > 0 }
  );

  const { data: notes, refetch: refetchNotes } = trpc.leads.getNotes.useQuery(
    { leadId },
    { enabled: isAuthenticated && leadId > 0 }
  );

  const updateStatus = trpc.leads.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      refetch();
    },
  });

  const addNote = trpc.leads.addNote.useMutation({
    onSuccess: () => {
      toast.success("Note added");
      setNoteText("");
      refetchNotes();
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold mb-3">Admin Access Required</h1>
          <a href={getLoginUrl()}><Button>Sign In</Button></a>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Lead not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-storm-gradient text-white py-4 px-4">
        <div className="container flex items-center gap-4">
          <Link href="/dashboard">
            <span className="text-white/70 hover:text-white cursor-pointer transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </span>
          </Link>
          <div className="flex-1">
            <h1 className="font-display text-lg font-bold">
              {lead.firstName} {lead.lastName}
            </h1>
            <p className="text-white/60 text-xs">{lead.address}</p>
          </div>
          <Link href={`/dashboard/inspect/${leadId}`}>
            <Button size="sm" className="bg-amber-500 text-black hover:bg-amber-400 font-bold">
              <Zap className="w-4 h-4 mr-1" /> Inspect Mode
            </Button>
          </Link>
        </div>
      </header>

      <div className="py-6 px-4">
        <div className="container max-w-3xl space-y-6">
          {/* Score + Status Card */}
          <div className="bg-white border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white ${
                  (lead.leadScore || 0) >= 70 ? "bg-red-500" :
                  (lead.leadScore || 0) >= 40 ? "bg-amber-500" :
                  (lead.leadScore || 0) >= 20 ? "bg-blue-500" : "bg-gray-400"
                }`}>
                  {lead.leadScore || 0}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Lead Score</p>
                  <p className="font-bold text-foreground">
                    {(lead.leadScore || 0) >= 70 ? "🔥 Hot" :
                     (lead.leadScore || 0) >= 40 ? "⚡ Warm" :
                     (lead.leadScore || 0) >= 20 ? "📋 Cool" : "❄️ Cold"}
                  </p>
                </div>
              </div>
              <Badge className={`${STATUS_COLORS[lead.status] || ""} text-xs`}>
                {lead.status.replace("_", " ")}
              </Badge>
            </div>

            {/* Next Action */}
            {lead.nextAction && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4">
                <p className="text-xs font-semibold text-primary mb-1">Next Action:</p>
                <p className="text-sm text-foreground">{lead.nextAction}</p>
              </div>
            )}

            {/* Status Update */}
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(({ value, label }) => (
                <Button
                  key={value}
                  variant={lead.status === value ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => updateStatus.mutate({ id: leadId, status: value as any })}
                  disabled={updateStatus.isPending}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-white border border-border rounded-xl p-5">
            <h3 className="font-display text-base font-bold text-foreground mb-3">Contact Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>{lead.firstName} {lead.lastName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <a href={`tel:${lead.phone}`} className="text-primary hover:underline">{lead.phone}</a>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <a href={`mailto:${lead.email}`} className="text-primary hover:underline">{lead.email}</a>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>Best time: {lead.bestContactTime}</span>
              </div>
            </div>
          </div>

          {/* Property & Storm Info */}
          <div className="bg-white border border-border rounded-xl p-5">
            <h3 className="font-display text-base font-bold text-foreground mb-3">Property & Storm Data</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{lead.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span>
                  Address verified: {lead.addressVerified ? (
                    <span className="text-green-600 font-medium">✓ Confirmed in hail swath</span>
                  ) : (
                    <span className="text-muted-foreground">Not verified</span>
                  )}
                </span>
              </div>
              {lead.hailSizeConfirmed && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Hail size: <strong>{lead.hailSizeConfirmed}</strong></span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>Contractor selected: <strong>{lead.contractorSelected}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>Claim filed: <strong>{lead.claimFiled}</strong></span>
              </div>
            </div>

            {lead.stormConfirmationMsg && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-800">{lead.stormConfirmationMsg}</p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white border border-border rounded-xl p-5">
            <h3 className="font-display text-base font-bold text-foreground mb-3">Notes</h3>
            <div className="space-y-3 mb-4">
              {notes && notes.length > 0 ? (
                notes.map((note) => (
                  <div key={note.id} className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm text-foreground">{note.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(note.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No notes yet.</p>
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (noteText.trim()) addNote.mutate({ leadId, content: noteText.trim() });
              }}
              className="flex gap-2"
            >
              <Textarea
                placeholder="Add a note..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="flex-1 min-h-[60px]"
              />
              <Button type="submit" size="sm" disabled={addNote.isPending || !noteText.trim()}>
                Add
              </Button>
            </form>
          </div>

          {/* Meta */}
          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>Created: {new Date(lead.createdAt).toLocaleString()}</p>
            <p>Last activity: {new Date(lead.lastActivityAt).toLocaleString()}</p>
            <p>Source: {lead.source} {lead.qrCodeScanned ? "· QR Code" : ""}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
