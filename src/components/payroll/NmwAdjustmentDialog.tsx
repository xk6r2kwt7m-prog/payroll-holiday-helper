/**
 * UK Minimum Wage correction dialog.
 *
 * Opened from the "Adjust" action on a non-compliant row of the
 * MinimumWageCompliancePanel. Two correction routes only:
 *
 *   1. Top-up payment  — adds to payroll_entries.special_bonus (counts toward NMW)
 *   2. Correct the rate — sets payroll_entries.hourly_rate for THIS period only
 *
 * Every save writes an immutable payroll_adjustments audit row and a composite
 * reason on the entry. Service charge is never used to make up NMW. Approved
 * (closed) periods are read-only and the dialog refuses to save.
 */
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatCurrency } from "@/hooks/useHolidays";
import { useUpdatePayrollEntry } from "@/hooks/usePayroll";
import { useCreatePayrollAdjustment } from "@/hooks/usePayrollAdjustments";
import { OVERRIDE_REASON_CATEGORIES, categoryLabel } from "@/lib/payroll-hours-override";
import { PENNY_TOLERANCE, type NmwResult } from "@/lib/payroll-nmw";

export interface NmwAdjustableEntry {
  id: string;
  employee_id: string;
  timesheet_hours: number | null;
  hourly_rate: number | null;
  service_charge: number | null;
  performance_bonus: number | null;
  special_bonus: number | null;
  adjustment_note?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  result: NmwResult | null;
  entry: NmwAdjustableEntry | null;
  periodId: string;
  periodStatus?: string | null;
}

type Mode = "top_up" | "rate";

export function NmwAdjustmentDialog({
  open,
  onOpenChange,
  result,
  entry,
  periodId,
  periodStatus,
}: Props) {
  const locked = periodStatus === "approved";
  const updateEntry = useUpdatePayrollEntry();
  const createAdjustment = useCreatePayrollAdjustment();

  const hours = Number(entry?.timesheet_hours) || 0;
  const currentRate = Number(entry?.hourly_rate) || 0;
  const required = result?.required_rate ?? 0;
  const shortfall = result?.shortfall ?? 0;

  const [mode, setMode] = useState<Mode>("top_up");
  const [topUp, setTopUp] = useState("");
  const [newRate, setNewRate] = useState("");
  const [category, setCategory] = useState<string>("agreed_correction");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode(currentRate > 0 ? "top_up" : "rate");
    setTopUp(shortfall > 0 ? shortfall.toFixed(2) : "");
    setNewRate(required > 0 ? required.toFixed(2) : "");
    setCategory("agreed_correction");
    setNote("");
  }, [open, currentRate, shortfall, required]);

  const preview = useMemo(() => {
    if (!result || hours <= 0) return null;
    const perf = Number(entry?.performance_bonus) || 0;
    const spec = Number(entry?.special_bonus) || 0;
    if (mode === "top_up") {
      const add = parseFloat(topUp) || 0;
      const eligible = hours * currentRate + perf + spec + add;
      return { eligible, effective: eligible / hours, add, rate: currentRate };
    }
    const rate = parseFloat(newRate) || 0;
    const eligible = hours * rate + perf + spec;
    return { eligible, effective: eligible / hours, add: 0, rate };
  }, [result, hours, entry, mode, topUp, newRate, currentRate]);

  const stillShort =
    !!preview && required > 0 && preview.effective + PENNY_TOLERANCE < required;

  const handleSave = async () => {
    if (!result || !entry) return;
    if (locked) {
      toast.error("This payroll period is approved and locked. Reopen it first.");
      return;
    }
    if (!preview) return;
    if (mode === "top_up" && (parseFloat(topUp) || 0) <= 0) {
      toast.error("Enter a top-up amount.");
      return;
    }
    if (mode === "rate" && (parseFloat(newRate) || 0) <= 0) {
      toast.error("Enter the corrected hourly rate.");
      return;
    }
    if (stillShort) {
      toast.error("That correction still leaves the employee below the legal minimum.");
      return;
    }

    const perf = Number(entry.performance_bonus) || 0;
    const spec = Number(entry.special_bonus) || 0;
    const sc = Number(entry.service_charge) || 0;

    const field = mode === "top_up" ? "special_bonus" : "hourly_rate";
    const oldValue = mode === "top_up" ? spec : currentRate;
    const newValue =
      mode === "top_up" ? spec + (parseFloat(topUp) || 0) : parseFloat(newRate) || 0;

    const rate = mode === "top_up" ? currentRate : newValue;
    const specFinal = mode === "top_up" ? newValue : spec;
    const totalPay = hours * rate + hours * sc + perf + specFinal;

    const reason =
      mode === "top_up"
        ? `Minimum wage top-up of ${formatCurrency(newValue - oldValue)} added for this period (effective £${preview.effective.toFixed(2)} vs required £${required.toFixed(2)}). Reason: ${categoryLabel(category)}`
        : `Minimum wage correction — hourly rate changed from £${oldValue.toFixed(2)} to £${newValue.toFixed(2)} for this period. Reason: ${categoryLabel(category)}`;
    const composite = note.trim() ? `${reason} — ${note.trim()}.` : `${reason}.`;

    setSaving(true);
    try {
      await updateEntry.mutateAsync({
        id: entry.id,
        periodStatus: periodStatus ?? undefined,
        updates: {
          [field]: newValue,
          total_pay: totalPay,
          adjustment_note: entry.adjustment_note
            ? `${entry.adjustment_note}\n${composite}`
            : composite,
        } as never,
      });
      await createAdjustment.mutateAsync([
        {
          payroll_period_id: periodId,
          payroll_entry_id: entry.id,
          employee_id: entry.employee_id,
          field_name: field,
          old_value: oldValue,
          new_value: newValue,
          note: composite,
        },
      ]);
      toast.success(
        `${result.employee_name} corrected — now £${preview.effective.toFixed(2)}/hr against £${required.toFixed(2)} required.`,
      );
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Could not save the correction.");
    } finally {
      setSaving(false);
    }
  };

  if (!result || !entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            Correct minimum wage — {result.employee_name}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {result.message} Tips and service charge can never be used to reach the legal minimum.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-border bg-muted/40 p-3 text-xs space-y-1">
          <Row label="Worked hours" value={hours.toFixed(2)} />
          <Row label="Current rate" value={`£${currentRate.toFixed(2)}`} />
          <Row label="Required rate" value={`£${required.toFixed(2)} (${result.age_band_label})`} />
          <Row label="Eligible pay now" value={formatCurrency(result.eligible_pay)} />
          <Row label="Shortfall" value={formatCurrency(shortfall)} />
        </div>

        <div className="space-y-3">
          <Label className="text-xs font-medium">How do you want to correct it?</Label>
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as Mode)} className="space-y-2">
            <label className="flex items-start gap-2 rounded-md border border-border p-3 cursor-pointer">
              <RadioGroupItem value="top_up" className="mt-0.5" />
              <span className="text-xs">
                <span className="font-medium block">Add a top-up payment</span>
                Paid through this period as an extra amount. Does not change the hourly rate.
              </span>
            </label>
            <label className="flex items-start gap-2 rounded-md border border-border p-3 cursor-pointer">
              <RadioGroupItem value="rate" className="mt-0.5" />
              <span className="text-xs">
                <span className="font-medium block">Correct the hourly rate</span>
                Applies to this payroll period. Employment terms are not changed here.
              </span>
            </label>
          </RadioGroup>

          {mode === "top_up" ? (
            <div className="space-y-1.5">
              <Label htmlFor="nmw-topup" className="text-xs">Top-up amount (£)</Label>
              <Input
                id="nmw-topup"
                inputMode="decimal"
                value={topUp}
                onChange={(e) => setTopUp(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="nmw-rate" className="text-xs">Corrected hourly rate (£)</Label>
              <Input
                id="nmw-rate"
                inputMode="decimal"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Reason</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OVERRIDE_REASON_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value} className="text-xs">
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nmw-note" className="text-xs">Note (optional)</Label>
            <Textarea
              id="nmw-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything you want recorded with this correction"
            />
          </div>

          {preview && (
            <div
              className={`rounded-md border p-3 text-xs ${
                stillShort
                  ? "border-destructive/40 bg-destructive/5 text-destructive"
                  : "border-success/30 bg-success/5"
              }`}
            >
              <div className="flex items-center gap-1.5 font-medium">
                {stillShort ? (
                  <AlertTriangle className="h-3.5 w-3.5" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5 text-success" />
                )}
                After this correction: £{preview.effective.toFixed(2)}/hr
              </div>
              <p className="mt-1 opacity-80">
                {stillShort
                  ? `Still below the required £${required.toFixed(2)}.`
                  : `Meets the required £${required.toFixed(2)}. Eligible pay ${formatCurrency(preview.eligible)}.`}
              </p>
            </div>
          )}

          {locked && (
            <p className="text-xs text-destructive">
              This payroll period is approved and locked. Reopen it before making corrections.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || locked || stillShort}>
            {saving ? "Saving…" : "Save correction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums font-medium">{value}</span>
    </div>
  );
}
