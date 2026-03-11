import { useState } from "react";
import { Sparkles, Globe, Shield, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useUpsertTalentProfile } from "@/hooks/useTalentPool";
import { toast } from "sonner";

interface TalentOptInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  tenantId: string;
}

export function TalentOptInDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  tenantId,
}: TalentOptInDialogProps) {
  const upsertProfile = useUpsertTalentProfile();
  const [optIn, setOptIn] = useState(false);
  const [form, setForm] = useState({
    visibility_mode: "previous_employer_only",
    preferred_countries: "",
    preferred_locations: "",
    profile_summary: "",
    available_from: "",
    talent_pool_status: "available_now",
    contact_visibility: false,
  });

  const handleSave = async () => {
    if (!optIn) {
      onOpenChange(false);
      return;
    }

    try {
      await upsertProfile.mutateAsync({
        employee_id: employeeId,
        tenant_id: tenantId,
        talent_pool_status: form.talent_pool_status as any,
        seeking_visibility: "actively_available" as any,
        visibility_mode: form.visibility_mode as any,
        available_from: form.available_from || null,
        preferred_countries: form.preferred_countries ? form.preferred_countries.split(",").map(s => s.trim()) : [],
        preferred_locations: form.preferred_locations ? form.preferred_locations.split(",").map(s => s.trim()) : [],
        profile_summary: form.profile_summary || null,
        contact_visibility: form.contact_visibility,
        open_to_work_flag: true,
        opted_in_at: new Date().toISOString(),
      });
      toast.success("Talent pool opt-in saved");
      onOpenChange(false);
    } catch {
      toast.error("Failed to save opt-in");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Talent Pool Opt-In
          </DialogTitle>
          <DialogDescription>
            {employeeName} is leaving. Would they like to be available for future opportunities through the talent pool?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div>
              <p className="text-sm font-medium">Join Talent Pool</p>
              <p className="text-xs text-muted-foreground">
                Be visible for future job opportunities
              </p>
            </div>
            <Switch checked={optIn} onCheckedChange={setOptIn} />
          </div>

          {optIn && (
            <>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  Visibility
                </Label>
                <Select
                  value={form.visibility_mode}
                  onValueChange={(v) => setForm({ ...form, visibility_mode: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="previous_employer_only">Previous Employer Only</SelectItem>
                    <SelectItem value="selected_companies">Selected Companies</SelectItem>
                    <SelectItem value="approved_country_region">Approved Country/Region</SelectItem>
                    <SelectItem value="all_approved">All Approved Companies</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Availability</Label>
                <Select
                  value={form.talent_pool_status}
                  onValueChange={(v) => setForm({ ...form, talent_pool_status: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available_now">Available Now</SelectItem>
                    <SelectItem value="available_from_date">Available from Date</SelectItem>
                    <SelectItem value="open_to_work">Open to Work</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.talent_pool_status === "available_from_date" && (
                <div className="space-y-2">
                  <Label>Available From</Label>
                  <Input
                    type="date"
                    value={form.available_from}
                    onChange={(e) => setForm({ ...form, available_from: e.target.value })}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" />
                  Preferred Countries
                </Label>
                <Input
                  value={form.preferred_countries}
                  onChange={(e) => setForm({ ...form, preferred_countries: e.target.value })}
                  placeholder="e.g. United Kingdom, Ireland"
                />
              </div>

              <div className="space-y-2">
                <Label>Preferred Locations</Label>
                <Input
                  value={form.preferred_locations}
                  onChange={(e) => setForm({ ...form, preferred_locations: e.target.value })}
                  placeholder="e.g. London, Manchester"
                />
              </div>

              <div className="space-y-2">
                <Label>Brief Summary</Label>
                <Textarea
                  value={form.profile_summary}
                  onChange={(e) => setForm({ ...form, profile_summary: e.target.value })}
                  rows={2}
                  placeholder="Experience and what you're looking for"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    Show Contact Details
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Allow potential employers to see contact info
                  </p>
                </div>
                <Switch
                  checked={form.contact_visibility}
                  onCheckedChange={(v) => setForm({ ...form, contact_visibility: v })}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {optIn ? "Cancel" : "Skip"}
          </Button>
          <Button onClick={handleSave} disabled={upsertProfile.isPending}>
            {optIn ? "Save & Join" : "No Thanks"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
