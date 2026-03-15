import { useState, useEffect } from "react";
import { Shield, Globe, Briefcase, MapPin, Eye, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useOwnTalentProfile, useUpsertTalentProfile } from "@/hooks/useTalentPool";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function TalentProfileManager() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const { data: existingProfile, isLoading } = useOwnTalentProfile();
  const upsertProfile = useUpsertTalentProfile();

  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [form, setForm] = useState({
    talent_pool_status: "not_available" as string,
    seeking_visibility: "not_looking" as string,
    visibility_mode: "hidden" as string,
    available_from: "",
    preferred_roles: "",
    preferred_locations: "",
    preferred_countries: "",
    preferred_regions: "",
    employment_type_preference: [] as string[],
    contact_visibility: false,
    profile_summary: "",
    years_experience: "",
    languages: "",
    work_eligibility_countries: "",
    willing_to_relocate: false,
    willing_to_travel: false,
    preferred_work_radius_km: "",
    open_to_work_flag: false,
  });

  // Fetch employee_id
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("employees")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setEmployeeId(data.id);
      });
  }, [user?.id]);

  // Populate form from existing profile
  useEffect(() => {
    if (existingProfile) {
      setForm({
        talent_pool_status: existingProfile.talent_pool_status,
        seeking_visibility: existingProfile.seeking_visibility,
        visibility_mode: existingProfile.visibility_mode,
        available_from: existingProfile.available_from || "",
        preferred_roles: (existingProfile.preferred_roles || []).join(", "),
        preferred_locations: (existingProfile.preferred_locations || []).join(", "),
        preferred_countries: (existingProfile.preferred_countries || []).join(", "),
        preferred_regions: (existingProfile.preferred_regions || []).join(", "),
        employment_type_preference: existingProfile.employment_type_preference || [],
        contact_visibility: existingProfile.contact_visibility,
        profile_summary: existingProfile.profile_summary || "",
        years_experience: existingProfile.years_experience?.toString() || "",
        languages: (existingProfile.languages || []).join(", "),
        work_eligibility_countries: (existingProfile.work_eligibility_countries || []).join(", "),
        willing_to_relocate: existingProfile.willing_to_relocate || false,
        willing_to_travel: existingProfile.willing_to_travel || false,
        preferred_work_radius_km: existingProfile.preferred_work_radius_km?.toString() || "",
        open_to_work_flag: existingProfile.open_to_work_flag,
      });
    }
  }, [existingProfile]);

  const splitCSV = (s: string) => s ? s.split(",").map((v) => v.trim()).filter(Boolean) : [];

  const handleSave = async () => {
    if (!employeeId || !tenantId) {
      toast.error("Unable to save — employee profile not linked");
      return;
    }

    try {
      await upsertProfile.mutateAsync({
        employee_id: employeeId,
        tenant_id: tenantId,
        talent_pool_status: form.talent_pool_status as any,
        seeking_visibility: form.seeking_visibility as any,
        visibility_mode: form.visibility_mode as any,
        available_from: form.available_from || null,
        preferred_roles: splitCSV(form.preferred_roles),
        preferred_locations: splitCSV(form.preferred_locations),
        preferred_countries: splitCSV(form.preferred_countries),
        preferred_regions: splitCSV(form.preferred_regions),
        employment_type_preference: form.employment_type_preference,
        contact_visibility: form.contact_visibility,
        profile_summary: form.profile_summary || null,
        years_experience: form.years_experience ? parseInt(form.years_experience) : null,
        languages: splitCSV(form.languages),
        work_eligibility_countries: splitCSV(form.work_eligibility_countries),
        willing_to_relocate: form.willing_to_relocate,
        willing_to_travel: form.willing_to_travel,
        preferred_work_radius_km: form.preferred_work_radius_km ? parseInt(form.preferred_work_radius_km) : null,
        open_to_work_flag: form.open_to_work_flag,
        opted_in_at: form.open_to_work_flag ? new Date().toISOString() : null,
      });
      toast.success("Talent profile saved");
    } catch {
      toast.error("Failed to save profile");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!employeeId) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            Your user account is not linked to an employee record.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Contact your admin to link your account.
          </p>
        </CardContent>
      </Card>
    );
  }

  const toggleEmploymentType = (type: string) => {
    setForm((prev) => ({
      ...prev,
      employment_type_preference: prev.employment_type_preference.includes(type)
        ? prev.employment_type_preference.filter((t) => t !== type)
        : [...prev.employment_type_preference, type],
    }));
  };

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Privacy Notice */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Your profile is private and worker-owned</p>
              <p>Your former employer cannot see, edit, or track your marketplace activity. Only companies you allow can view your anonymised profile (first name + surname initial only).</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Opt-in Control */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Talent Pool Opt-In
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Open to Work</p>
              <p className="text-xs text-muted-foreground">
                Enable this to make your profile visible in the talent pool
              </p>
            </div>
            <Switch
              checked={form.open_to_work_flag}
              onCheckedChange={(v) =>
                setForm({
                  ...form,
                  open_to_work_flag: v,
                  talent_pool_status: v ? "open_to_work" : "not_available",
                })
              }
            />
          </div>

          {form.open_to_work_flag && (
            <>
              <div className="space-y-2">
                <Label>Availability Status</Label>
                <Select
                  value={form.talent_pool_status}
                  onValueChange={(v) => setForm({ ...form, talent_pool_status: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open_to_work">Open to Work</SelectItem>
                    <SelectItem value="available_now">Available Now</SelectItem>
                    <SelectItem value="available_from_date">Available from Date</SelectItem>
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
                <Label>Job Seeking Visibility</Label>
                <Select
                  value={form.seeking_visibility}
                  onValueChange={(v) => setForm({ ...form, seeking_visibility: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discreetly_open">Discreetly Open</SelectItem>
                    <SelectItem value="actively_available">Actively Available</SelectItem>
                    <SelectItem value="selected_employers">Selected Employers Only</SelectItem>
                    <SelectItem value="specific_country_region">Specific Country/Region</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Privacy & Visibility */}
      {form.open_to_work_flag && (
        <Collapsible defaultOpen>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Privacy & Visibility
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Who Can See Your Profile</Label>
                  <Select
                    value={form.visibility_mode}
                    onValueChange={(v) => setForm({ ...form, visibility_mode: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="selected_companies">Selected Companies</SelectItem>
                      <SelectItem value="approved_country_region">Approved Country/Region</SelectItem>
                      <SelectItem value="all_approved">All Approved Companies</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Show Contact Details</p>
                    <p className="text-xs text-muted-foreground">
                      Allow companies to see your contact information
                    </p>
                  </div>
                  <Switch
                    checked={form.contact_visibility}
                    onCheckedChange={(v) => setForm({ ...form, contact_visibility: v })}
                  />
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Profile Details */}
      {form.open_to_work_flag && (
        <Collapsible defaultOpen>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Profile Details
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Profile Summary</Label>
                  <Textarea
                    value={form.profile_summary}
                    onChange={(e) => setForm({ ...form, profile_summary: e.target.value })}
                    rows={3}
                    placeholder="Brief description of your experience and what you're looking for"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Years of Experience</Label>
                    <Input
                      type="number"
                      value={form.years_experience}
                      onChange={(e) => setForm({ ...form, years_experience: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Languages (comma separated)</Label>
                    <Input
                      value={form.languages}
                      onChange={(e) => setForm({ ...form, languages: e.target.value })}
                      placeholder="English, Spanish"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Preferred Roles (comma separated)</Label>
                  <Input
                    value={form.preferred_roles}
                    onChange={(e) => setForm({ ...form, preferred_roles: e.target.value })}
                    placeholder="e.g. Head Chef, Sous Chef"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Employment Type</Label>
                  <div className="flex flex-wrap gap-2">
                    {["permanent", "temporary", "casual", "contract"].map((t) => (
                      <Badge
                        key={t}
                        variant={form.employment_type_preference.includes(t) ? "default" : "outline"}
                        className="cursor-pointer capitalize"
                        onClick={() => toggleEmploymentType(t)}
                      >
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Geography */}
      {form.open_to_work_flag && (
        <Collapsible defaultOpen>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Geography & Work Eligibility
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Preferred Countries (comma separated)</Label>
                  <Input
                    value={form.preferred_countries}
                    onChange={(e) => setForm({ ...form, preferred_countries: e.target.value })}
                    placeholder="e.g. United Kingdom, Ireland"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preferred Locations (comma separated)</Label>
                  <Input
                    value={form.preferred_locations}
                    onChange={(e) => setForm({ ...form, preferred_locations: e.target.value })}
                    placeholder="e.g. London, Manchester"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Work Eligibility Countries (comma separated)</Label>
                  <Input
                    value={form.work_eligibility_countries}
                    onChange={(e) => setForm({ ...form, work_eligibility_countries: e.target.value })}
                    placeholder="Countries where you have right to work"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Willing to Relocate</Label>
                    <Switch
                      checked={form.willing_to_relocate}
                      onCheckedChange={(v) => setForm({ ...form, willing_to_relocate: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Willing to Travel</Label>
                    <Switch
                      checked={form.willing_to_travel}
                      onCheckedChange={(v) => setForm({ ...form, willing_to_travel: v })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Preferred Work Radius (km)</Label>
                  <Input
                    type="number"
                    value={form.preferred_work_radius_km}
                    onChange={(e) => setForm({ ...form, preferred_work_radius_km: e.target.value })}
                    placeholder="e.g. 50"
                  />
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Save */}
      <Button onClick={handleSave} disabled={upsertProfile.isPending} className="w-full gap-2">
        {upsertProfile.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Save Profile
      </Button>
    </div>
  );
}
