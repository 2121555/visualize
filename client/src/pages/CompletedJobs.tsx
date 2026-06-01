import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Camera, CheckCircle, MapPin, Plus, Upload } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function CompletedJobs() {
  const { user, loading, isAuthenticated } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    address: "",
    city: "",
    state: "IL",
    zip: "",
    targetCity: "naperville" as string,
    completionDate: new Date().toISOString().split("T")[0],
    permissionLevel: "anonymous" as string,
    notes: "",
  });

  const completedJobsQuery = trpc.completedJobs.list.useQuery();
  const addJobMutation = trpc.completedJobs.create.useMutation({
    onSuccess: () => {
      toast.success("Completed job added successfully");
      setShowForm(false);
      setFormData({ address: "", city: "", state: "IL", zip: "", targetCity: "naperville", completionDate: new Date().toISOString().split("T")[0], permissionLevel: "anonymous", notes: "" });
      completedJobsQuery.refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const uploadPhotoMutation = trpc.completedJobs.uploadPhoto.useMutation({
    onSuccess: () => {
      toast.success("Photo uploaded");
      completedJobsQuery.refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full" /></div>;
  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  const handleSubmit = () => {
    if (!formData.address || !formData.city) {
      toast.error("Address and city are required");
      return;
    }
    addJobMutation.mutate({
      address: `${formData.address}, ${formData.city}, ${formData.state} ${formData.zip}`,
      city: formData.city,
      targetCity: formData.targetCity as "naperville" | "willow-springs" | "sag-bridge" | "palisades",
      completionDate: formData.completionDate,
      permissionLevel: formData.permissionLevel as "full" | "anonymous" | "count_only",
      notes: formData.notes || undefined,
    });
  };

  const handlePhotoUpload = async (jobId: number, photoType: "before" | "after", file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadPhotoMutation.mutate({
        jobId,
        photoType,
        base64Data: base64,
        fileName: file.name,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-[var(--color-navy)]">
      {/* Header */}
      <header className="border-b border-white/10 bg-[var(--color-navy-light)]">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-white/60 hover:text-white text-sm">← Dashboard</Link>
            <h1 className="text-xl font-bold text-white font-[Oswald]">Completed Jobs</h1>
          </div>
          <Button onClick={() => setShowForm(!showForm)} size="sm" className="bg-amber-500 hover:bg-amber-600 text-black">
            <Plus className="h-4 w-4 mr-1" /> Add Job
          </Button>
        </div>
      </header>

      <main className="container py-8 space-y-6">
        {/* Add Job Form */}
        {showForm && (
          <Card className="bg-[var(--color-navy-light)] border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Add Completed Restoration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/70">Address *</Label>
                  <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="123 Main St" className="bg-white/5 border-white/20 text-white" />
                </div>
                <div>
                  <Label className="text-white/70">City *</Label>
                  <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="Naperville" className="bg-white/5 border-white/20 text-white" />
                </div>
                <div>
                  <Label className="text-white/70">ZIP</Label>
                  <Input value={formData.zip} onChange={(e) => setFormData({ ...formData, zip: e.target.value })} placeholder="60540" className="bg-white/5 border-white/20 text-white" />
                </div>
                <div>
                  <Label className="text-white/70">Target City</Label>
                  <Select value={formData.targetCity} onValueChange={(v) => setFormData({ ...formData, targetCity: v })}>
                    <SelectTrigger className="bg-white/5 border-white/20 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="naperville">Naperville</SelectItem>
                      <SelectItem value="willow-springs">Willow Springs</SelectItem>
                      <SelectItem value="sag-bridge">Sag Bridge</SelectItem>
                      <SelectItem value="palisades">Palisades</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-white/70">Completion Date</Label>
                  <Input type="date" value={formData.completionDate} onChange={(e) => setFormData({ ...formData, completionDate: e.target.value })} className="bg-white/5 border-white/20 text-white" />
                </div>
                <div>
                  <Label className="text-white/70">Permission Level</Label>
                  <Select value={formData.permissionLevel} onValueChange={(v) => setFormData({ ...formData, permissionLevel: v })}>
                    <SelectTrigger className="bg-white/5 border-white/20 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full (show address)</SelectItem>
                      <SelectItem value="count_only">Count Only</SelectItem>
                      <SelectItem value="anonymous">Anonymous</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-white/70">Notes</Label>
                <Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Optional notes about the job" className="bg-white/5 border-white/20 text-white" />
              </div>
              <Button onClick={handleSubmit} disabled={addJobMutation.isPending} className="bg-green-600 hover:bg-green-700">
                {addJobMutation.isPending ? "Adding..." : "Add Completed Job"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Jobs List */}
        {completedJobsQuery.isLoading ? (
          <div className="text-center text-white/60 py-12">Loading completed jobs...</div>
        ) : completedJobsQuery.data?.length === 0 ? (
          <Card className="bg-[var(--color-navy-light)] border-white/10">
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/60">No completed jobs yet. Add your first one to start building Jones collateral.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {completedJobsQuery.data?.map((job: any) => (
              <Card key={job.id} className="bg-[var(--color-navy-light)] border-white/10">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-amber-500" />
                        <span className="text-white font-medium">{job.address}, {job.city}</span>
                      </div>
                      <div className="text-white/50 text-sm mt-1">
                        Completed: {new Date(job.completionDate).toLocaleDateString()} | Permission: {job.permissionLevel}
                      </div>
                      {job.notes && <div className="text-white/40 text-sm mt-1">{job.notes}</div>}
                    </div>
                    <div className="flex gap-2">
                      {/* Before Photo Upload */}
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handlePhotoUpload(job.id, "before", file);
                          }}
                        />
                        <div className="flex items-center gap-1 px-3 py-1.5 rounded bg-white/5 border border-white/20 text-white/70 hover:text-white hover:border-white/40 text-xs">
                          <Camera className="h-3 w-3" /> Before
                        </div>
                      </label>
                      {/* After Photo Upload */}
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handlePhotoUpload(job.id, "after", file);
                          }}
                        />
                        <div className="flex items-center gap-1 px-3 py-1.5 rounded bg-white/5 border border-white/20 text-white/70 hover:text-white hover:border-white/40 text-xs">
                          <Upload className="h-3 w-3" /> After
                        </div>
                      </label>
                    </div>
                  </div>
                  {/* Photo thumbnails */}
                  {((job.beforePhotos as string[])?.length > 0 || (job.afterPhotos as string[])?.length > 0) && (
                    <div className="mt-3 flex gap-4">
                      {(job.beforePhotos as string[])?.length > 0 && (
                        <div>
                          <span className="text-xs text-white/40">Before:</span>
                          <div className="flex gap-1 mt-1">
                            {(job.beforePhotos as string[]).map((url: string, i: number) => (
                              <img key={i} src={url} alt="Before" className="h-16 w-16 object-cover rounded border border-white/20" />
                            ))}
                          </div>
                        </div>
                      )}
                      {(job.afterPhotos as string[])?.length > 0 && (
                        <div>
                          <span className="text-xs text-white/40">After:</span>
                          <div className="flex gap-1 mt-1">
                            {(job.afterPhotos as string[]).map((url: string, i: number) => (
                              <img key={i} src={url} alt="After" className="h-16 w-16 object-cover rounded border border-white/20" />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
