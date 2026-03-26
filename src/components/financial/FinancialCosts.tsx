import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface Props {
  foodCostPct: number;
  foodCostAmount: number;
  totalLabourCost: number;
  labourPct: number;
  wasteAmount: number;
  wastePct: number;
  stockVariance: number;
  totalRevenue: number;
  hasFoodCostData: boolean;
  hasWasteData: boolean;
}

function fmt(n: number) {
  if (Math.abs(n) >= 1000) return `£${(n / 1000).toFixed(1)}k`;
  return `£${n.toFixed(0)}`;
}

function PlaceholderNotice({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      <span>{label} data is not yet connected. Values shown are estimates.</span>
    </div>
  );
}

export function FinancialCosts(props: Props) {
  return (
    <div className="space-y-6">
      {/* Food Cost */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Food Cost</h4>
        {!props.hasFoodCostData && <PlaceholderNotice label="Food cost" />}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Food Cost</p>
            <p className="text-base font-bold tabular-nums text-foreground mt-0.5">{fmt(props.foodCostAmount)}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Food Cost %</p>
            <p className="text-base font-bold tabular-nums text-foreground mt-0.5">{props.foodCostPct.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Labour */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Labour</h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Labour Cost</p>
            <p className="text-base font-bold tabular-nums text-foreground mt-0.5">{fmt(props.totalLabourCost)}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Labour %</p>
            <p className={`text-base font-bold tabular-nums mt-0.5 ${props.labourPct > 35 ? "text-destructive" : "text-foreground"}`}>
              {props.labourPct.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Waste & Variance */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Waste & Stock Variance</h4>
        {!props.hasWasteData && <PlaceholderNotice label="Waste and stock variance" />}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "Waste", value: fmt(props.wasteAmount) },
            { label: "Waste %", value: `${props.wastePct.toFixed(1)}%` },
            { label: "Stock Correction", value: fmt(props.stockVariance) },
            { label: "Variance %", value: props.totalRevenue > 0 ? `${((props.stockVariance / props.totalRevenue) * 100).toFixed(1)}%` : "0.0%" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-card p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
              <p className="text-base font-bold tabular-nums text-foreground mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
