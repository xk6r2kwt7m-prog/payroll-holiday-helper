import { Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface TargetMetric {
  label: string;
  actual: number;
  target: number;
  unit: string;
  lowerIsBetter?: boolean;
  isEstimated?: boolean;
}

interface Props {
  labourPct: number;
  revenuePerLabourHour: number;
  operatingMarginPct: number;
  hasRevenueData: boolean;
}

function GapBar({ actual, target, lowerIsBetter }: { actual: number; target: number; lowerIsBetter?: boolean }) {
  const gap = actual - target;
  const isGood = lowerIsBetter ? gap <= 0 : gap >= 0;
  const pct = target > 0 ? Math.min((actual / target) * 100, 150) : 0;

  return (
    <div className="space-y-1">
      <div className="h-2 rounded-full bg-muted overflow-hidden relative">
        {/* Target marker */}
        <div className="absolute top-0 bottom-0 w-px bg-foreground/40 z-10" style={{ left: `${Math.min((target / (target * 1.5)) * 100, 100)}%` }} />
        <div
          className={cn("h-full rounded-full transition-all", isGood ? "bg-emerald-500" : "bg-red-500")}
          style={{ width: `${Math.min(pct / 1.5, 100)}%` }}
        />
      </div>
    </div>
  );
}

export function TargetsPanel(props: Props) {
  if (!props.hasRevenueData) return null;

  const metrics: TargetMetric[] = [
    { label: "Labour %", actual: props.labourPct, target: 30, unit: "%", lowerIsBetter: true },
    { label: "Rev / Labour Hr", actual: props.revenuePerLabourHour, target: 30, unit: "£" },
    { label: "Op. Margin", actual: props.operatingMarginPct, target: 10, unit: "%", isEstimated: true },
  ];

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2 mb-3">
        <Target className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold text-foreground">Targets vs Actual</span>
        <span className="text-[9px] text-muted-foreground ml-auto">Default benchmarks</span>
      </div>
      <div className="space-y-3">
        {metrics.map((m) => {
          const gap = m.actual - m.target;
          const isGood = m.lowerIsBetter ? gap <= 0 : gap >= 0;
          return (
            <div key={m.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">
                  {m.label}
                  {m.isEstimated && <span className="text-amber-600 ml-0.5">(est.)</span>}
                </span>
                <div className="flex items-center gap-2 text-[10px] tabular-nums">
                  <span className={cn("font-semibold", isGood ? "text-emerald-600" : "text-red-500")}>
                    {m.unit === "£" ? `£${m.actual.toFixed(0)}` : `${m.actual.toFixed(1)}%`}
                  </span>
                  <span className="text-muted-foreground">
                    / {m.unit === "£" ? `£${m.target}` : `${m.target}%`}
                  </span>
                  <span className={cn("font-medium", isGood ? "text-emerald-600" : "text-red-500")}>
                    ({gap >= 0 ? "+" : ""}{m.unit === "£" ? `£${gap.toFixed(0)}` : `${gap.toFixed(1)}pp`})
                  </span>
                </div>
              </div>
              <GapBar actual={m.actual} target={m.target} lowerIsBetter={m.lowerIsBetter} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
