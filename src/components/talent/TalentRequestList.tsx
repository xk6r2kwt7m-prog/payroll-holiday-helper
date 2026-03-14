import { useState } from "react";
import { Plus, FileText, Sparkles, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDepartments } from "@/hooks/useDepartments";
import { useTalentRequests, useCreateTalentRequest, useTalentMatches } from "@/hooks/useTalentPool";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const URGENCY_COLORS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-blue-500/10 text-blue-700",
  high: "bg-amber-500/10 text-amber-700",
  urgent: "bg-destructive/10 text-destructive",
};

export function TalentRequestList() {
  const { data: requests = [], isLoading } = useTalentRequests();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Talent Requests</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Talent Request</DialogTitle>
            </DialogHeader>
            <CreateTalentRequestForm onSuccess={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-5 w-40 bg-muted rounded mb-2" />
                <div className="h-4 w-28 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && requests.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No talent requests yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create a request to find suitable candidates
            </p>
          </CardContent>
        </Card>
      )}

      {requests.map((req) => (
        <Card
          key={req.id}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setSelectedRequestId(selectedRequestId === req.id ? null : req.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{req.role}</h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  {req.department && <span>{req.department}</span>}
                  {req.location && <span>• {req.location}</span>}
                  {req.country && <span>• {req.country}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={URGENCY_COLORS[req.urgency] || ""}>
                  {req.urgency}
                </Badge>
                <Badge variant={req.status === "open" ? "default" : "secondary"}>
                  {req.status}
                </Badge>
                <ChevronRight
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    selectedRequestId === req.id ? "rotate-90" : ""
                  }`}
                />
              </div>
            </div>
            {selectedRequestId === req.id && (
              <div className="mt-4 pt-4 border-t border-border">
                <TalentMatchesSection requestId={req.id} />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TalentMatchesSection({ requestId }: { requestId: string }) {
  const { data: matches = [], isLoading } = useTalentMatches(requestId);
  const [running, setRunning] = useState(false);
  const { tenantId } = useTenant();

  const runAIMatch = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("talent-ai-match", {
        body: { talent_request_id: requestId, tenant_id: tenantId },
      });
      if (error) throw error;
      toast.success(`Found ${data?.matches_created || 0} potential matches`);
    } catch {
      toast.error("AI matching failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">AI Matches</h4>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={runAIMatch} disabled={running}>
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {running ? "Matching..." : "Run AI Match"}
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading matches...</p>}

      {!isLoading && matches.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No matches yet. Click "Run AI Match" to find candidates.
        </p>
      )}

      {matches.map((m) => (
        <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div>
            <p className="text-sm font-medium">
              {m.talent_profile?.employee?.forename} {m.talent_profile?.employee?.surname}
            </p>
            <p className="text-xs text-muted-foreground">
              {m.talent_profile?.employee?.department} • Score: {Math.round((m.match_score || 0) * 100)}%
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {m.geography_match && <Badge variant="secondary" className="text-xs">📍 Geo</Badge>}
            {m.skill_match && <Badge variant="secondary" className="text-xs">⭐ Skills</Badge>}
            <Badge variant={m.status === "pending" ? "outline" : "default"} className="text-xs">
              {m.status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

function CreateTalentRequestForm({ onSuccess }: { onSuccess: () => void }) {
  const createRequest = useCreateTalentRequest();
  const [form, setForm] = useState({
    role: "",
    department: "",
    location: "",
    region: "",
    country: "",
    employment_type: "",
    urgency: "normal",
    required_skills: "",
    required_training: "",
    notes: "",
    status: "open",
    created_by: null as string | null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.role.trim()) {
      toast.error("Role is required");
      return;
    }
    try {
      await createRequest.mutateAsync({
        ...form,
        required_skills: form.required_skills ? form.required_skills.split(",").map((s) => s.trim()) : [],
        required_training: form.required_training ? form.required_training.split(",").map((s) => s.trim()) : [],
      });
      toast.success("Talent request created");
      onSuccess();
    } catch {
      toast.error("Failed to create request");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Role *</Label>
        <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. Head Chef" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Department</Label>
          <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="FOH">FOH</SelectItem>
              <SelectItem value="BOH">BOH</SelectItem>
              <SelectItem value="CPU">CPU</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Urgency</Label>
          <Select value={form.urgency} onValueChange={(v) => setForm({ ...form, urgency: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Location</Label>
          <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. London" />
        </div>
        <div className="space-y-2">
          <Label>Country</Label>
          <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="e.g. United Kingdom" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Employment Type</Label>
        <Select value={form.employment_type} onValueChange={(v) => setForm({ ...form, employment_type: v })}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="permanent">Permanent</SelectItem>
            <SelectItem value="temporary">Temporary</SelectItem>
            <SelectItem value="casual">Casual</SelectItem>
            <SelectItem value="contract">Contract</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Required Skills (comma separated)</Label>
        <Input value={form.required_skills} onChange={(e) => setForm({ ...form, required_skills: e.target.value })} placeholder="e.g. Food Prep, Team Leadership" />
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
      </div>
      <Button type="submit" className="w-full" disabled={createRequest.isPending}>
        {createRequest.isPending ? "Creating..." : "Create Request"}
      </Button>
    </form>
  );
}
