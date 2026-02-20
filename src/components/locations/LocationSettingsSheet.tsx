import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, Building2, CalendarClock, ClipboardCheck } from "lucide-react";
import { useUpdateLocationSettings, type LocationSettings } from "@/hooks/useLocationSettings";
import { BRANCH_EMOJI } from "@/hooks/useBranches";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

interface Props {
  location: LocationSettings;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LocationSettingsSheet({ location, open, onOpenChange }: Props) {
  const updateSettings = useUpdateLocationSettings();

  // Form state
  const [displayName, setDisplayName] = useState(location.display_name);
  const [address, setAddress] = useState(location.address || "");
  const [timezone, setTimezone] = useState(location.timezone);
  const [operatingHours, setOperatingHours] = useState(location.operating_hours);

  // Scheduling
  const [allowOpenShifts, setAllowOpenShifts] = useState(location.allow_open_shifts);
  const [allowShiftSwaps, setAllowShiftSwaps] = useState(location.allow_shift_swaps);
  const [allowShiftOffers, setAllowShiftOffers] = useState(location.allow_shift_offers);

  // Timesheets
  const [allowWebClockIn, setAllowWebClockIn] = useState(location.allow_web_clock_in);
  const [allowMobileClockIn, setAllowMobileClockIn] = useState(location.allow_mobile_clock_in);
  const [requireGps, setRequireGps] = useState(location.require_gps_on_clock_in);
  const [requireGeofence, setRequireGeofence] = useState(location.require_geofence);
  const [geofenceRadius, setGeofenceRadius] = useState(location.geofence_radius_meters);
  const [autoApprove, setAutoApprove] = useState(location.auto_approve_timesheets);
  const [minShiftLength, setMinShiftLength] = useState(location.minimum_shift_length_minutes);
  const [defaultBreak, setDefaultBreak] = useState(location.default_break_minutes);
  const [enforceBreakAfter, setEnforceBreakAfter] = useState(location.enforce_break_after_hours);

  // Reset form when location changes
  useEffect(() => {
    setDisplayName(location.display_name);
    setAddress(location.address || "");
    setTimezone(location.timezone);
    setOperatingHours(location.operating_hours);
    setAllowOpenShifts(location.allow_open_shifts);
    setAllowShiftSwaps(location.allow_shift_swaps);
    setAllowShiftOffers(location.allow_shift_offers);
    setAllowWebClockIn(location.allow_web_clock_in);
    setAllowMobileClockIn(location.allow_mobile_clock_in);
    setRequireGps(location.require_gps_on_clock_in);
    setRequireGeofence(location.require_geofence);
    setGeofenceRadius(location.geofence_radius_meters);
    setAutoApprove(location.auto_approve_timesheets);
    setMinShiftLength(location.minimum_shift_length_minutes);
    setDefaultBreak(location.default_break_minutes);
    setEnforceBreakAfter(location.enforce_break_after_hours);
  }, [location]);

  const updateHour = (day: string, field: "open" | "close", value: string) => {
    setOperatingHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const handleSave = () => {
    updateSettings.mutate({
      id: location.id,
      display_name: displayName,
      address: address || null,
      timezone,
      operating_hours: operatingHours,
      allow_open_shifts: allowOpenShifts,
      allow_shift_swaps: allowShiftSwaps,
      allow_shift_offers: allowShiftOffers,
      allow_web_clock_in: allowWebClockIn,
      allow_mobile_clock_in: allowMobileClockIn,
      require_gps_on_clock_in: requireGps,
      require_geofence: requireGeofence,
      geofence_radius_meters: geofenceRadius,
      auto_approve_timesheets: autoApprove,
      minimum_shift_length_minutes: minShiftLength,
      default_break_minutes: defaultBreak,
      enforce_break_after_hours: enforceBreakAfter,
    });
  };

  const emoji = BRANCH_EMOJI[location.branch as keyof typeof BRANCH_EMOJI] || "📍";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <span className="text-2xl">{emoji}</span>
            {location.display_name} Settings
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general" className="text-xs sm:text-sm">
              <Building2 className="h-4 w-4 mr-1.5 hidden sm:inline" />
              General
            </TabsTrigger>
            <TabsTrigger value="scheduling" className="text-xs sm:text-sm">
              <CalendarClock className="h-4 w-4 mr-1.5 hidden sm:inline" />
              Scheduling
            </TabsTrigger>
            <TabsTrigger value="timesheets" className="text-xs sm:text-sm">
              <ClipboardCheck className="h-4 w-4 mr-1.5 hidden sm:inline" />
              Timesheets
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter address..." />
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="font-semibold text-card-foreground">Operating Hours</h4>
              <div className="space-y-2">
                {DAYS.map((day) => (
                  <div key={day} className="grid grid-cols-[60px_1fr_auto_1fr] items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">{day}</span>
                    <Input
                      type="time"
                      value={operatingHours[day]?.open || ""}
                      onChange={(e) => updateHour(day, "open", e.target.value)}
                      className="h-9 text-sm"
                    />
                    <span className="text-muted-foreground text-xs">to</span>
                    <Input
                      type="time"
                      value={operatingHours[day]?.close || ""}
                      onChange={(e) => updateHour(day, "close", e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Scheduling Tab */}
          <TabsContent value="scheduling" className="space-y-4">
            <ToggleRow
              label="Allow open shifts"
              description="Staff can pick up unassigned shifts"
              checked={allowOpenShifts}
              onCheckedChange={setAllowOpenShifts}
            />
            <Separator />
            <ToggleRow
              label="Allow shift swaps"
              description="Staff can swap shifts with each other"
              checked={allowShiftSwaps}
              onCheckedChange={setAllowShiftSwaps}
            />
            <Separator />
            <ToggleRow
              label="Allow shift offers"
              description="Staff can offer their shifts to others"
              checked={allowShiftOffers}
              onCheckedChange={setAllowShiftOffers}
            />
          </TabsContent>

          {/* Timesheets Tab */}
          <TabsContent value="timesheets" className="space-y-4">
            <h4 className="font-semibold text-card-foreground">Clock-in Methods</h4>
            <ToggleRow
              label="Web clock-in"
              description="Allow clocking in via web browser"
              checked={allowWebClockIn}
              onCheckedChange={setAllowWebClockIn}
            />
            <Separator />
            <ToggleRow
              label="Mobile clock-in"
              description="Allow clocking in via mobile app"
              checked={allowMobileClockIn}
              onCheckedChange={setAllowMobileClockIn}
            />
            <Separator />
            <ToggleRow
              label="Require GPS on clock-in"
              description="Capture location when staff clock in"
              checked={requireGps}
              onCheckedChange={setRequireGps}
            />
            <Separator />
            <ToggleRow
              label="Require geofence"
              description="Staff must be within radius to clock in"
              checked={requireGeofence}
              onCheckedChange={setRequireGeofence}
            />
            {requireGeofence && (
              <div className="space-y-2 pl-1">
                <Label>Geofence radius (meters)</Label>
                <Input
                  type="number"
                  value={geofenceRadius}
                  onChange={(e) => setGeofenceRadius(Number(e.target.value))}
                  className="w-32"
                />
              </div>
            )}
            <Separator />
            <ToggleRow
              label="Auto-approve timesheets"
              description="Automatically approve when staff clock out"
              checked={autoApprove}
              onCheckedChange={setAutoApprove}
            />

            <Separator />
            <h4 className="font-semibold text-card-foreground pt-2">Shift & Break Rules</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Minimum shift length (min)</Label>
                <Input
                  type="number"
                  value={minShiftLength}
                  onChange={(e) => setMinShiftLength(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Default break (min)</Label>
                <Input
                  type="number"
                  value={defaultBreak}
                  onChange={(e) => setDefaultBreak(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Enforce break after (hours)</Label>
              <Input
                type="number"
                step="0.5"
                value={enforceBreakAfter}
                onChange={(e) => setEnforceBreakAfter(Number(e.target.value))}
                className="w-32"
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end pt-6 border-t border-border mt-6">
          <Button
            className="gradient-primary"
            onClick={handleSave}
            disabled={updateSettings.isPending}
          >
            {updateSettings.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium text-card-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
