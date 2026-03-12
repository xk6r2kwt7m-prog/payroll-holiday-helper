import { useState } from "react";
import { Plus, Edit2, Archive, MapPin, Loader2, MoreHorizontal, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocationSettings, useUpdateLocationSettings, type LocationSettings } from "@/hooks/useLocationSettings";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getBranchEmoji, useTenantBranches } from "@/hooks/useBranches";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const DEFAULT_HOURS: Record<string, { open: string; close: string }> = {
  Mon: { open: "10:00", close: "22:00" },
  Tue: { open: "10:00", close: "22:00" },
  Wed: { open: "10:00", close: "22:00" },
  Thu: { open: "10:00", close: "22:00" },
  Fri: { open: "10:00", close: "23:00" },
  Sat: { open: "10:00", close: "23:00" },
  Sun: { open: "10:00", close: "21:00" },
};

export function LocationManagement() {
  const { data: locations = [], isLoading } = useLocationSettings();
  const updateSettings = useUpdateLocationSettings();
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const [editingLocation, setEditingLocation] = useState<LocationSettings | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    display_name: "",
    address: "",
    timezone: "Europe/London",
    operating_hours: DEFAULT_HOURS as Record<string, { open: string; close: string }>,
    allow_open_shifts: true,
    allow_shift_swaps: false,
    allow_shift_offers: false,
    allow_web_clock_in: true,
    allow_mobile_clock_in: true,
    require_gps_on_clock_in: true,
    require_geofence: true,
    geofence_radius_meters: 100,
    auto_approve_timesheets: false,
    minimum_shift_length_minutes: 60,
    default_break_minutes: 0,
    enforce_break_after_hours: 6,
  });

  const openCreate = () => {
    setFormData({
      display_name: "",
      address: "",
      timezone: "Europe/London",
      operating_hours: DEFAULT_HOURS,
      allow_open_shifts: true,
      allow_shift_swaps: false,
      allow_shift_offers: false,
      allow_web_clock_in: true,
      allow_mobile_clock_in: true,
      require_gps_on_clock_in: true,
      require_geofence: true,
      geofence_radius_meters: 100,
      auto_approve_timesheets: false,
      minimum_shift_length_minutes: 60,
      default_break_minutes: 0,
      enforce_break_after_hours: 6,
    });
    setEditingLocation(null);
    setIsCreating(true);
  };

  const openEdit = (loc: LocationSettings) => {
    setFormData({
      display_name: loc.display_name,
      address: loc.address || "",
      timezone: loc.timezone,
      operating_hours: loc.operating_hours,
      allow_open_shifts: loc.allow_open_shifts,
      allow_shift_swaps: loc.allow_shift_swaps,
      allow_shift_offers: loc.allow_shift_offers,
      allow_web_clock_in: loc.allow_web_clock_in,
      allow_mobile_clock_in: loc.allow_mobile_clock_in,
      require_gps_on_clock_in: loc.require_gps_on_clock_in,
      require_geofence: loc.require_geofence,
      geofence_radius_meters: loc.geofence_radius_meters,
      auto_approve_timesheets: loc.auto_approve_timesheets,
      minimum_shift_length_minutes: loc.minimum_shift_length_minutes,
      default_break_minutes: loc.default_break_minutes,
      enforce_break_after_hours: loc.enforce_break_after_hours,
    });
    setEditingLocation(loc);
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!formData.display_name.trim()) {
      toast.error("Display name is required");
      return;
    }
    setIsSaving(true);
    try {
      if (editingLocation) {
        // Update
        updateSettings.mutate({
          id: editingLocation.id,
          display_name: formData.display_name,
          address: formData.address || null,
          timezone: formData.timezone,
          operating_hours: formData.operating_hours,
          allow_open_shifts: formData.allow_open_shifts,
          allow_shift_swaps: formData.allow_shift_swaps,
          allow_shift_offers: formData.allow_shift_offers,
          allow_web_clock_in: formData.allow_web_clock_in,
          allow_mobile_clock_in: formData.allow_mobile_clock_in,
          require_gps_on_clock_in: formData.require_gps_on_clock_in,
          require_geofence: formData.require_geofence,
          geofence_radius_meters: formData.geofence_radius_meters,
          auto_approve_timesheets: formData.auto_approve_timesheets,
          minimum_shift_length_minutes: formData.minimum_shift_length_minutes,
          default_break_minutes: formData.default_break_minutes,
          enforce_break_after_hours: formData.enforce_break_after_hours,
        });
      } else {
        // Create - use the display_name as branch identifier
        const branchName = formData.display_name.trim();
        const { error } = await supabase
          .from("location_settings")
          .insert({
            tenant_id: tenantId!,
            branch: branchName as any,
            display_name: formData.display_name,
            address: formData.address || null,
            timezone: formData.timezone,
            operating_hours: formData.operating_hours,
            allow_open_shifts: formData.allow_open_shifts,
            allow_shift_swaps: formData.allow_shift_swaps,
            allow_shift_offers: formData.allow_shift_offers,
            allow_web_clock_in: formData.allow_web_clock_in,
            allow_mobile_clock_in: formData.allow_mobile_clock_in,
            require_gps_on_clock_in: formData.require_gps_on_clock_in,
            require_geofence: formData.require_geofence,
            geofence_radius_meters: formData.geofence_radius_meters,
            auto_approve_timesheets: formData.auto_approve_timesheets,
            minimum_shift_length_minutes: formData.minimum_shift_length_minutes,
            default_break_minutes: formData.default_break_minutes,
            enforce_break_after_hours: formData.enforce_break_after_hours,
          } as any);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["location_settings"] });
        toast.success("Location created");
      }
      setIsCreating(false);
      setEditingLocation(null);
    } catch (err: any) {
      toast.error("Failed: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const updateHour = (day: string, field: "open" | "close", value: string) => {
    setFormData(prev => ({
      ...prev,
      operating_hours: {
        ...prev.operating_hours,
        [day]: { ...prev.operating_hours[day], [field]: value },
      },
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {locations.length} location{locations.length !== 1 ? "s" : ""} configured
        </p>
        <Button size="sm" onClick={openCreate} className="text-xs">
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Location
        </Button>
      </div>

      {/* Location cards */}
      <div className="space-y-2">
        {locations.map((loc) => {
          const emoji = BRANCH_EMOJI[loc.branch as keyof typeof BRANCH_EMOJI] || "📍";
          return (
            <div
              key={loc.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
            >
              <span className="text-lg">{emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{loc.display_name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {loc.address || "No address set"} · {loc.timezone}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[10px] hidden sm:flex">
                  <Clock className="h-2.5 w-2.5 mr-1" />
                  {loc.operating_hours?.Mon?.open || "—"}–{loc.operating_hours?.Mon?.close || "—"}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(loc)}>
                      <Edit2 className="h-3.5 w-3.5 mr-2" />
                      Edit Location
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
        {locations.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No locations configured yet. Add your first location to get started.
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreating} onOpenChange={(o) => { if (!o) { setIsCreating(false); setEditingLocation(null); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              {editingLocation ? "Edit Location" : "Add Location"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Basic Info */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">General</h4>
              <div className="space-y-1.5">
                <Label className="text-xs">Display Name *</Label>
                <Input value={formData.display_name} onChange={e => setFormData(p => ({ ...p, display_name: e.target.value }))} placeholder="e.g. Fitzrovia" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Address</Label>
                <Input value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} placeholder="Full address" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Timezone</Label>
                <Input value={formData.timezone} onChange={e => setFormData(p => ({ ...p, timezone: e.target.value }))} className="h-9" />
              </div>
            </div>

            <Separator />

            {/* Operating Hours */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Operating Hours</h4>
              <div className="space-y-1.5">
                {DAYS.map(day => (
                  <div key={day} className="grid grid-cols-[50px_1fr_auto_1fr] items-center gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">{day}</span>
                    <Input type="time" value={formData.operating_hours[day]?.open || ""} onChange={e => updateHour(day, "open", e.target.value)} className="h-8 text-xs" />
                    <span className="text-muted-foreground text-[10px]">to</span>
                    <Input type="time" value={formData.operating_hours[day]?.close || ""} onChange={e => updateHour(day, "close", e.target.value)} className="h-8 text-xs" />
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Scheduling */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Scheduling</h4>
              <ToggleField label="Open shifts" checked={formData.allow_open_shifts} onChange={v => setFormData(p => ({ ...p, allow_open_shifts: v }))} />
              <ToggleField label="Shift swaps" checked={formData.allow_shift_swaps} onChange={v => setFormData(p => ({ ...p, allow_shift_swaps: v }))} />
              <ToggleField label="Shift offers" checked={formData.allow_shift_offers} onChange={v => setFormData(p => ({ ...p, allow_shift_offers: v }))} />
            </div>

            <Separator />

            {/* Timesheets */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Timesheets & Clock-in</h4>
              <ToggleField label="Web clock-in" checked={formData.allow_web_clock_in} onChange={v => setFormData(p => ({ ...p, allow_web_clock_in: v }))} />
              <ToggleField label="Mobile clock-in" checked={formData.allow_mobile_clock_in} onChange={v => setFormData(p => ({ ...p, allow_mobile_clock_in: v }))} />
              <ToggleField label="Require GPS" checked={formData.require_gps_on_clock_in} onChange={v => setFormData(p => ({ ...p, require_gps_on_clock_in: v }))} />
              <ToggleField label="Require geofence" checked={formData.require_geofence} onChange={v => setFormData(p => ({ ...p, require_geofence: v }))} />
              {formData.require_geofence && (
                <div className="space-y-1 pl-1">
                  <Label className="text-xs">Geofence radius (m)</Label>
                  <Input type="number" value={formData.geofence_radius_meters} onChange={e => setFormData(p => ({ ...p, geofence_radius_meters: Number(e.target.value) }))} className="h-8 w-28 text-xs" />
                </div>
              )}
              <ToggleField label="Auto-approve timesheets" checked={formData.auto_approve_timesheets} onChange={v => setFormData(p => ({ ...p, auto_approve_timesheets: v }))} />
            </div>

            <Separator />

            {/* Break Policy */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Break Policy</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Min shift (min)</Label>
                  <Input type="number" value={formData.minimum_shift_length_minutes} onChange={e => setFormData(p => ({ ...p, minimum_shift_length_minutes: Number(e.target.value) }))} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Default break (min)</Label>
                  <Input type="number" value={formData.default_break_minutes} onChange={e => setFormData(p => ({ ...p, default_break_minutes: Number(e.target.value) }))} className="h-8 text-xs" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Enforce break after (hrs)</Label>
                <Input type="number" step="0.5" value={formData.enforce_break_after_hours} onChange={e => setFormData(p => ({ ...p, enforce_break_after_hours: Number(e.target.value) }))} className="h-8 w-28 text-xs" />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button variant="outline" size="sm" onClick={() => { setIsCreating(false); setEditingLocation(null); }}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving...</> : editingLocation ? "Save Changes" : "Create Location"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-xs font-medium text-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} className="scale-90" />
    </div>
  );
}
