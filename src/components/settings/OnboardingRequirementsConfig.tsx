import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useTenantOnboardingRequirements } from "@/hooks/useOnboardingReadiness";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Save, Loader2, Plus, GripVertical, AlertTriangle, Shield } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function OnboardingRequirementsConfig() {
  const { tenantId } = useTenant();
  const { data: requirements = [], isLoading } = useTenantOnboardingRequirements();
  const qc = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [localReqs, setLocalReqs] = useState<typeof requirements | null>(null);
  const [newLabel, setNewLabel] = useState("");

  const reqs = localReqs ?? requirements;

  // Sync from server when loaded
  if (!localReqs && requirements.length > 0 && !isLoading) {
    setLocalReqs([...requirements]);
  }

  const updateReq = (id: string, field: string, value: any) => {
    setLocalReqs(prev => (prev || []).map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const addRequirement = () => {
    if (!newLabel.trim()) return;
    const key = newLabel.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    setLocalReqs(prev => [
      ...(prev || []),
      {
        id: `new_${Date.now()}`,
        requirement_key: key,
        requirement_label: newLabel.trim(),
        requirement_type: "custom",
        is_critical: false,
        is_required: true,
        display_order: (prev || []).length + 1,
      } as any,
    ]);
    setNewLabel("");
  };

  const handleSave = async () => {
    if (!tenantId || !localReqs) return;
    setIsSaving(true);
    try {
      // Delete existing and re-insert
      await supabase
        .from("tenant_onboarding_requirements" as any)
        .delete()
        .eq("tenant_id", tenantId);

      const inserts = localReqs.map((r, i) => ({
        tenant_id: tenantId,
        requirement_key: r.requirement_key,
        requirement_label: r.requirement_label,
        requirement_type: r.requirement_type,
        is_critical: r.is_critical,
        is_required: r.is_required,
        display_order: i + 1,
      }));

      const { error } = await supabase
        .from("tenant_onboarding_requirements" as any)
        .insert(inserts as any);
      if (error) throw error;

      qc.invalidateQueries({ queryKey: ["tenant_onboarding_requirements"] });
      toast.success("Onboarding requirements saved");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Configure which onboarding steps are required and which are critical for work readiness.
      </p>

      <div className="space-y-2">
        {reqs.map(req => (
          <div key={req.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
            <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{req.requirement_label}</p>
              <p className="text-[10px] text-muted-foreground font-mono">{req.requirement_key}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1.5">
                <Label className="text-[10px] text-muted-foreground">Required</Label>
                <Switch
                  checked={req.is_required}
                  onCheckedChange={v => updateReq(req.id, "is_required", v)}
                  className="scale-75"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Label className="text-[10px] text-destructive">Critical</Label>
                <Switch
                  checked={req.is_critical}
                  onCheckedChange={v => updateReq(req.id, "is_critical", v)}
                  className="scale-75"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Separator />

      {/* Add custom requirement */}
      <div className="flex gap-2">
        <Input
          placeholder="New requirement label..."
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          className="h-9 text-sm"
          onKeyDown={e => e.key === "Enter" && addRequirement()}
        />
        <Button size="sm" variant="outline" onClick={addRequirement} disabled={!newLabel.trim()}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add
        </Button>
      </div>

      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/5 border border-destructive/10">
        <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
        <p className="text-[11px] text-muted-foreground">
          <strong className="text-destructive">Critical</strong> requirements block employees from being scheduled. 
          Only mark items as critical if they are legally required before work begins (e.g. Right to Work).
        </p>
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving...</> : <><Save className="h-3.5 w-3.5 mr-1.5" />Save Requirements</>}
        </Button>
      </div>
    </div>
  );
}
