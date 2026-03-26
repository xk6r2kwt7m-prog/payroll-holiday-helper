import { ShieldCheck, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type HealthStatus = "on_track" | "at_risk" | "critical";

interface Props {
  labourPct: number;
  revenueTrend: number;
  operatingMarginPct: number;
  revenuePerLabourHour: number;
  hasRevenueData: boolean;
  comparePrevious: boolean;
}

interface Signal {
  label: string;
  status: HealthStatus;
  detail: string;
  isEstimated?: boolean;
}

const statusConfig = {
  on_track: { icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "On Track" },
  at_risk: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-500/10", border: "border-amber-500/30", label: "At Risk" },
  critical: { icon: XCircle, color: "text-red-600", bg: "bg-red-500/10", border: "border-red-500/30", label: "Critical" },
};

function getOverallStatus(signals: Signal[]): HealthStatus {
  if (signals.some(s => s.status === "critical")) return "critical";
  if (signals.some(s => s.status === "at_risk")) return "at_risk";
  return "on_track";
}

export function PerformanceSummary(props: Props) {
  if (!props.hasRevenueData) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center">
        <p className="text-xs text-muted-foreground">Add revenue data to see performance summary</p>
      </div>
    );
  }

  const signals: Signal[] = [];

  // Labour % signal (REAL)
  if (props.labourPct > 35) {
    signals.push({ label: "Labour %", status: "critical", detail: `${props.labourPct.toFixed(1)}% — above 35% threshold` });
  } else if (props.labourPct > 30) {
    signals.push({ label: "Labour %", status: "at_risk", detail: `${props.labourPct.toFixed(1)}% — approaching 30% target` });
  } else {
    signals.push({ label: "Labour %", status: "on_track", detail: `${props.labourPct.toFixed(1)}% — within target` });
  }

  // Revenue per labour hour (REAL)
  if (props.revenuePerLabourHour < 20) {
    signals.push({ label: "Rev / hour", status: "critical", detail: `£${props.revenuePerLabourHour.toFixed(0)} — well below £30 target` });
  } else if (props.revenuePerLabourHour < 30) {
    signals.push({ label: "Rev / hour", status: "at_risk", detail: `£${props.revenuePerLabourHour.toFixed(0)} — below £30 target` });
  } else {
    signals.push({ label: "Rev / hour", status: "on_track", detail: `£${props.revenuePerLabourHour.toFixed(0)} — meeting target` });
  }

  // Revenue trend (REAL, if comparing)
  if (props.comparePrevious) {
    if (props.revenueTrend < -10) {
      signals.push({ label: "Sales trend", status: "critical", detail: `${props.revenueTrend.toFixed(1)}% vs previous` });
    } else if (props.revenueTrend < 0) {
      signals.push({ label: "Sales trend", status: "at_risk", detail: `${props.revenueTrend.toFixed(1)}% vs previous` });
    } else {
      signals.push({ label: "Sales trend", status: "on_track", detail: `+${props.revenueTrend.toFixed(1)}% vs previous` });
    }
  }

  // Operating margin (ESTIMATED)
  if (props.operatingMarginPct < 5) {
    signals.push({ label: "Est. margin", status: "critical", detail: `${props.operatingMarginPct.toFixed(1)}% — below 10% target`, isEstimated: true });
  } else if (props.operatingMarginPct < 10) {
    signals.push({ label: "Est. margin", status: "at_risk", detail: `${props.operatingMarginPct.toFixed(1)}% — below 10% target`, isEstimated: true });
  } else {
    signals.push({ label: "Est. margin", status: "on_track", detail: `${props.operatingMarginPct.toFixed(1)}% — meeting target`, isEstimated: true });
  }

  const overall = getOverallStatus(signals);
  const cfg = statusConfig[overall];
  const OverallIcon = cfg.icon;

  return (
    <div className={cn("rounded-lg border p-3", cfg.border, cfg.bg)}>
      <div className="flex items-center gap-2 mb-2">
        <OverallIcon className={cn("h-4 w-4", cfg.color)} />
        <span className={cn("text-sm font-bold", cfg.color)}>{cfg.label}</span>
        <span className="text-[10px] text-muted-foreground ml-auto">Based on live + estimated signals</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {signals.map((s) => {
          const sCfg = statusConfig[s.status];
          const SIcon = sCfg.icon;
          return (
            <div key={s.label} className="flex items-start gap-1.5">
              <SIcon className={cn("h-3 w-3 mt-0.5 shrink-0", sCfg.color)} />
              <div>
                <p className="text-[10px] font-medium text-foreground leading-tight">
                  {s.label}
                  {s.isEstimated && <span className="text-amber-600 ml-0.5">*</span>}
                </p>
                <p className="text-[9px] text-muted-foreground leading-tight">{s.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
