import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { ArrowLeft, Mail, CheckCircle, Clock, Send, Trash2, Eye } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

export default function EmailQueue() {
  const { user, loading, isAuthenticated } = useAuth();
  const [selectedEmail, setSelectedEmail] = useState<number | null>(null);

  const { data: pendingEmails, isLoading, refetch } = trpc.notifications.pendingHomeownerEmails.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const markDelivered = trpc.notifications.markDelivered.useMutation({
    onSuccess: () => { refetch(); },
  });

  const dismiss = trpc.notifications.dismiss.useMutation({
    onSuccess: () => { refetch(); },
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">Admin access required.</p>
            <Button asChild>
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedEmailData = pendingEmails?.find((e: any) => e.id === selectedEmail);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container flex items-center gap-4 py-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Mail className="h-5 w-5 text-amber-500" />
              Homeowner Email Queue
            </h1>
            <p className="text-sm text-muted-foreground">
              Review and approve outbound homeowner messages
            </p>
          </div>
          <Badge variant="outline" className="text-amber-600 border-amber-300">
            {pendingEmails?.length || 0} pending
          </Badge>
        </div>
      </header>

      <main className="container py-6">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading queue...</div>
        ) : !pendingEmails?.length ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Queue Empty</h2>
              <p className="text-muted-foreground">
                No pending homeowner emails. Drip sequences will generate new messages automatically.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Email List */}
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Pending Messages ({pendingEmails.length})
              </h2>
              {pendingEmails.map((email: any) => (
                <Card
                  key={email.id}
                  className={`cursor-pointer transition-all hover:border-amber-300 ${
                    selectedEmail === email.id ? "border-amber-500 ring-1 ring-amber-500/20" : ""
                  }`}
                  onClick={() => setSelectedEmail(email.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="outline"
                            className={
                              email.type.includes("drip_24h") ? "text-blue-600 border-blue-300" :
                              email.type.includes("drip_3d") ? "text-purple-600 border-purple-300" :
                              email.type.includes("drip_7d") ? "text-red-600 border-red-300" :
                              "text-green-600 border-green-300"
                            }
                          >
                            {email.type.replace("homeowner_", "").replace("_", " ")}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(email.createdAt), "MMM d, h:mm a")}
                          </span>
                        </div>
                        <p className="font-medium text-sm text-foreground truncate">
                          To: {email.recipientEmail}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {email.title}
                        </p>
                      </div>
                      <Clock className="h-4 w-4 text-amber-500 flex-shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Email Preview */}
            <div className="lg:sticky lg:top-20 lg:self-start">
              {selectedEmailData ? (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Email Preview</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => {
                            dismiss.mutate({ id: selectedEmailData.id });
                            setSelectedEmail(null);
                          }}
                        >
                          <Trash2 className="h-3 w-3 mr-1" /> Dismiss
                        </Button>
                        <Button
                          size="sm"
                          className="bg-amber-600 hover:bg-amber-700 text-white"
                          onClick={() => {
                            markDelivered.mutate({ id: selectedEmailData.id });
                            setSelectedEmail(null);
                          }}
                        >
                          <Send className="h-3 w-3 mr-1" /> Mark Sent
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex gap-2">
                        <span className="text-muted-foreground w-12">To:</span>
                        <span className="font-medium">{selectedEmailData.recipientEmail}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-muted-foreground w-12">Subj:</span>
                        <span className="font-medium">{selectedEmailData.title}</span>
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed">
                        {selectedEmailData.content}
                      </pre>
                    </div>
                    <div className="border-t pt-3 text-xs text-muted-foreground">
                      <p>💡 Copy this content and send via your email client, or use the Gmail integration to send directly.</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Eye className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Select an email to preview</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
