import { useState } from "react";
import { Pencil, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { formatHours } from "@/hooks/useHolidays";
import { cn } from "@/lib/utils";

interface AdjustHolidayBalanceDialogProps {
  employeeId: string;
  employeeName: string;
  currentAccrued: number;
  currentTaken: number;
  currentBalance: number;
  year?: number;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function AdjustHolidayBalanceDialog({
  employeeId,
  employeeName,
  currentAccrued,
  currentTaken,
  currentBalance,
  year = new Date().getFullYear(),
  trigger,
  onSuccess,
}: AdjustHolidayBalanceDialogProps) {
  const [open, setOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<string>("accrued");
  const [hours, setHours] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  const hoursNum = parseFloat(hours) || 0;

  const previewAccrued = adjustmentType === "accrued" ? currentAccrued + hoursNum : currentAccrued;
  const previewTaken = adjustmentType === "taken" ? currentTaken + hoursNum : currentTaken;
  const previewBalance = previewAccrued - previewTaken;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hours || !reason) {
      toast.error("Hours and reason are required");
      return;
    }

    try {
      const { error } = await supabase.from("holiday_adjustments").insert({
        employee_id: employeeId,
        adjustment_type: adjustmentType,
        hours: hoursNum,
        reason,
        notes: notes || null,
        leave_year_start: `${year}-01-01`,
        leave_year_end: `${year}-12-31`,
      });

      if (error) throw error;

      toast.success(`Holiday ${adjustmentType} adjusted by ${hoursNum > 0 ? "+" : ""}${formatHours(hoursNum)} hrs`);
      queryClient.invalidateQueries({ queryKey: ["holiday_adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["payroll_entries"] });
      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save adjustment");
    }
  };

  const resetForm = () => {
    setAdjustmentType("accrued");
    setHours("");
    setReason("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
            <Pencil className="h-3 w-3 mr-1" />
            Adjust
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Adjust Holiday Balance
          </DialogTitle>
          <DialogDescription>
            {employeeName} — {year} Leave Year
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Current values */}
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Current Values</p>
            <div className="grid grid-cols-3 gap-2 text-sm text-center">
              <div>
                <p className="text-lg font-bold text-success">{formatHours(currentAccrued)}</p>
                <p className="text-xs text-muted-foreground">Accrued</p>
              </div>
              <div>
                <p className="text-lg font-bold text-primary">{formatHours(currentTaken)}</p>
                <p className="text-xs text-muted-foreground">Taken</p>
              </div>
              <div>
                <p className={cn("text-lg font-bold", currentBalance >= 0 ? "text-accent" : "text-destructive")}>
                  {formatHours(currentBalance)}
                </p>
                <p className="text-xs text-muted-foreground">Balance</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>What to adjust *</Label>
            <Select value={adjustmentType} onValueChange={setAdjustmentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="accrued">Hours Accrued</SelectItem>
                <SelectItem value="taken">Hours Taken</SelectItem>
                <SelectItem value="carried_over">Carried Over</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Adjustment Hours *</Label>
            <Input
              type="number"
              step="0.01"
              value={hours}
              onChange={e => setHours(e.target.value)}
              placeholder="e.g. +5.00 or -3.50"
              required
            />
            <p className="text-[10px] text-muted-foreground">
              Use positive to add, negative to subtract
            </p>
          </div>

          {/* Preview */}
          {hoursNum !== 0 && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs font-semibold mb-2">After Adjustment</p>
              <div className="grid grid-cols-3 gap-2 text-sm text-center">
                <div>
                  <p className={cn("text-lg font-bold", adjustmentType === "accrued" ? "text-primary" : "text-success")}>
                    {formatHours(previewAccrued)}
                  </p>
                  <p className="text-xs text-muted-foreground">Accrued</p>
                </div>
                <div>
                  <p className={cn("text-lg font-bold", adjustmentType === "taken" ? "text-primary" : "text-primary")}>
                    {formatHours(previewTaken)}
                  </p>
                  <p className="text-xs text-muted-foreground">Taken</p>
                </div>
                <div>
                  <p className={cn("text-lg font-bold", previewBalance >= 0 ? "text-accent" : "text-destructive")}>
                    {formatHours(previewBalance)}
                  </p>
                  <p className="text-xs text-muted-foreground">Balance</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Correction — accrual was miscalculated">Correction — accrual miscalculated</SelectItem>
                <SelectItem value="Correction — holiday taken was recorded incorrectly">Correction — taken recorded incorrectly</SelectItem>
                <SelectItem value="Manual carry-over adjustment">Manual carry-over adjustment</SelectItem>
                <SelectItem value="Agreed additional holiday entitlement">Agreed additional entitlement</SelectItem>
                <SelectItem value="Manager override">Manager override</SelectItem>
                <SelectItem value="Other">Other (specify in notes)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Additional details for audit trail..." />
          </div>

          <div className="flex items-start gap-2 p-2 rounded bg-warning/10 border border-warning/20 text-xs text-warning">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>This adjustment will be logged in the audit trail and cannot be undone. Create a reverse adjustment if needed.</span>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!hours || !reason}>
              Save Adjustment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
