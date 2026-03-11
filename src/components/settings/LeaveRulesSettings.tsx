import { useEffect, useState } from "react";
import { Calendar, Info, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useLeaveRules, useUpdateTenantLeaveSettings } from "@/hooks/useLeaveRules";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

export function LeaveRulesSettings() {
  const { data: rules, isLoading } = useLeaveRules();
  const updateSettings = useUpdateTenantLeaveSettings();
  const { tenantCountry } = useTenant();

  const [accrualRate, setAccrualRate] = useState("");
  const [weekHours, setWeekHours] = useState("");
  const [dayHours, setDayHours] = useState("");
  const [workdays, setWorkdays] = useState("");
  const [maxCarryover, setMaxCarryover] = useState("");
  const [leaveYearMonth, setLeaveYearMonth] = useState("");
  const [leaveYearDay, setLeaveYearDay] = useState("");
  const [autoAccrual, setAutoAccrual] = useState(true);
  const [includeServiceCharge, setIncludeServiceCharge] = useState(false);
  const [roundingPrecision, setRoundingPrecision] = useState("2");

  useEffect(() => {
    if (rules) {
      setAccrualRate(String(rules.accrualRate));
      setWeekHours(String(rules.standardWeekHours));
      setDayHours(String(rules.standardDayHours));
      setWorkdays(String(rules.workdaysPerWeek));
      setMaxCarryover(String(rules.maxCarryoverDays));
      setLeaveYearMonth(String(rules.leaveYearStartMonth));
      setLeaveYearDay(String(rules.leaveYearStartDay));
      setAutoAccrual(rules.autoCalculateAccrual);
      setIncludeServiceCharge(rules.includeServiceChargeInHoliday);
      setRoundingPrecision(String(rules.roundingPrecision));
    }
  }, [rules]);

  const handleSave = () => {
    const updates: Record<string, any> = {
      accrual_rate: parseFloat(accrualRate) || null,
      standard_week_hours: parseFloat(weekHours) || null,
      standard_day_hours: parseFloat(dayHours) || null,
      workdays_per_week: parseInt(workdays) || null,
      max_carryover_days: parseInt(maxCarryover) ?? null,
      leave_year_start_month: parseInt(leaveYearMonth) || null,
      leave_year_start_day: parseInt(leaveYearDay) || null,
      auto_calculate_accrual: autoAccrual,
      include_service_charge_in_holiday: includeServiceCharge,
      rounding_precision: parseInt(roundingPrecision) || 2,
    };

    updateSettings.mutate(updates, {
      onSuccess: () => toast.success("Leave rules updated"),
      onError: (err) => toast.error("Failed to update: " + err.message),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Country info */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
        <Info className="h-4 w-4 shrink-0" />
        <p>
          Country defaults: <span className="font-medium text-foreground">{rules?.countryName || tenantCountry || "GB"}</span>. 
          Values below override country defaults. Clear a field to fall back to the default.
        </p>
      </div>

      {/* Accrual */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Accrual Settings</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="accrual-rate">Accrual Rate</Label>
            <Input
              id="accrual-rate"
              type="number"
              step="0.0001"
              value={accrualRate}
              onChange={(e) => setAccrualRate(e.target.value)}
              placeholder={String(rules?.accrualRate ?? "0.1207")}
            />
            <p className="text-xs text-muted-foreground">Hours accrued per hour worked</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rounding">Rounding Precision</Label>
            <Input
              id="rounding"
              type="number"
              min="0"
              max="4"
              value={roundingPrecision}
              onChange={(e) => setRoundingPrecision(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Decimal places for calculations</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Workweek */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Workweek</h4>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="week-hours">Weekly Hours</Label>
            <Input
              id="week-hours"
              type="number"
              value={weekHours}
              onChange={(e) => setWeekHours(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="day-hours">Daily Hours</Label>
            <Input
              id="day-hours"
              type="number"
              value={dayHours}
              onChange={(e) => setDayHours(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="workdays">Workdays / Week</Label>
            <Input
              id="workdays"
              type="number"
              min="1"
              max="7"
              value={workdays}
              onChange={(e) => setWorkdays(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Carry-over & Leave Year */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Carry-over &amp; Leave Year</h4>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="carryover">Max Carry-over Days</Label>
            <Input
              id="carryover"
              type="number"
              min="0"
              value={maxCarryover}
              onChange={(e) => setMaxCarryover(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ly-month">Leave Year Start Month</Label>
            <Input
              id="ly-month"
              type="number"
              min="1"
              max="12"
              value={leaveYearMonth}
              onChange={(e) => setLeaveYearMonth(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ly-day">Leave Year Start Day</Label>
            <Input
              id="ly-day"
              type="number"
              min="1"
              max="31"
              value={leaveYearDay}
              onChange={(e) => setLeaveYearDay(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Toggles */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-foreground">Options</h4>
        <div className="flex items-center justify-between min-h-[48px]">
          <div>
            <p className="font-medium text-card-foreground">Auto-calculate accrual</p>
            <p className="text-sm text-muted-foreground">Automatically compute holiday accrual from hours worked</p>
          </div>
          <Switch checked={autoAccrual} onCheckedChange={setAutoAccrual} />
        </div>
        <Separator />
        <div className="flex items-center justify-between min-h-[48px]">
          <div>
            <p className="font-medium text-card-foreground">Include service charge in holiday pay</p>
            <p className="text-sm text-muted-foreground">Factor service charge into holiday pay calculations</p>
          </div>
          <Switch checked={includeServiceCharge} onCheckedChange={setIncludeServiceCharge} />
        </div>
      </div>

      {/* Statutory info (read-only) */}
      <div className="rounded-lg border border-border p-4 space-y-2 bg-muted/30">
        <h4 className="text-sm font-semibold text-foreground">Country Statutory Values (read-only)</h4>
        <div className="grid gap-2 sm:grid-cols-3 text-sm">
          <div>
            <span className="text-muted-foreground">Statutory Weeks:</span>{" "}
            <span className="font-medium">{rules?.statutoryWeeks}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Max Days:</span>{" "}
            <span className="font-medium">{rules?.maxStatutoryDays}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Public Holidays:</span>{" "}
            <span className="font-medium">{rules?.publicHolidayCount} ({rules?.publicHolidaysIncluded ? "included" : "excluded"})</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateSettings.isPending}>
          {updateSettings.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save Leave Rules"
          )}
        </Button>
      </div>
    </div>
  );
}
