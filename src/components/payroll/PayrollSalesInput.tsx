import { useState, useEffect } from "react";
import { TrendingUp, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/hooks/useHolidays";

interface PayrollSalesInputProps {
  periodId: string;
  periodStatus: string;
  currentSalesTotal: number | null;
  totalPayroll: number;
  managementPayroll: number;
  isAdmin: boolean;
}

export function PayrollSalesInput({
  periodId,
  periodStatus,
  currentSalesTotal,
  totalPayroll,
  managementPayroll,
  isAdmin,
}: PayrollSalesInputProps) {
  const [sales, setSales] = useState("");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    setSales(currentSalesTotal ? currentSalesTotal.toString() : "");
  }, [currentSalesTotal, periodId]);

  const canEdit = isAdmin && (periodStatus === "draft" || periodStatus === "pending");
  const salesNum = parseFloat(sales) || 0;
  const operationalPayroll = totalPayroll - managementPayroll;
  const labourPct = salesNum > 0 ? (operationalPayroll / salesNum) * 100 : null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase
        .from("payroll_periods")
        .update({ sales_total: salesNum })
        .eq("id", periodId);
      queryClient.invalidateQueries({ queryKey: ["payroll_periods"] });
      toast.success("Sales revenue saved");
    } catch {
      toast.error("Failed to save sales");
    }
    setSaving(false);
  };

  return (
    <div className="rounded-xl bg-card shadow-card border border-border animate-fade-in min-w-0">
      <div className="p-3 sm:p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-card-foreground text-sm">Sales & Labour</h3>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
              Excl. management for operational cost analysis
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Sales Revenue (£)</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.01"
              min="0"
              className="h-8 text-xs"
              value={sales}
              onChange={(e) => setSales(e.target.value)}
              placeholder="0.00"
              disabled={!canEdit}
            />
            {canEdit && (
              <Button size="sm" variant="outline" className="h-8 px-2" onClick={handleSave} disabled={saving}>
                <Check className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Total Payroll</Label>
          <p className="text-sm font-semibold text-card-foreground">{formatCurrency(totalPayroll)}</p>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Operational (excl. mgmt)</Label>
          <p className="text-sm font-semibold text-card-foreground">
            {formatCurrency(operationalPayroll)}
            {managementPayroll > 0 && (
              <span className="text-xs text-muted-foreground ml-1">
                (mgmt: {formatCurrency(managementPayroll)})
              </span>
            )}
          </p>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Labour %</Label>
          <p className={`text-sm font-bold ${labourPct !== null && labourPct > 35 ? "text-destructive" : labourPct !== null && labourPct > 30 ? "text-warning" : "text-primary"}`}>
            {labourPct !== null ? `${labourPct.toFixed(1)}%` : "—"}
          </p>
          {labourPct !== null && (
            <p className="text-xs text-muted-foreground">
              {labourPct <= 25 ? "Excellent" : labourPct <= 30 ? "Good" : labourPct <= 35 ? "Average" : "High"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
