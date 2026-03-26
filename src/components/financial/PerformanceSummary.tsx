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

function SignalRow({ signal }: { signal: Signal }) {
  const sCfg = statusConfig[signal.status];
  const SIcon = sCfg.icon;
  return (
    <div className="flex items-start gap-1.5">
      <SIcon className={cn("h-3 w-3 mt-0.5 shrink-0", sCfg.color)} />
      <div>
        <p className="text-[10px] font-medium text-foreground leading-tight">{signal.label}</p>
        <p className="text-[9px] text-muted-foreground leading-tight">{signal.detail}</p>
      </div>
    </div>
  );
}

export function PerformanceSummary(props: Props) {
  if (!props.hasRevenueData) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center">
        <p className="text-xs text-muted-foreground">Add revenue data to see performance summary</p>
      </div>
    );
  }

  // ─── Real signals ───
  const realSignals: Signal[] = [];

  if (props.labourPct > 35) {
    realSignals.push({ label: "Labour %", status: "critical", detail: `${props.labourPct.toFixed(1)}% — above 35% threshold` });
  } else if (props.labourPct > 30) {
    realSignals.push({ label: "Labour %", status: "at_risk", detail: `${props.labourPct.toFixed(1)}% — approaching 30% target` });
  } else {
    realSignals.push({ label: "Labour %", status: "on_track", detail: `${props.labourPct.toFixed(1)}% — within target` });
  }

  if (props.revenuePerLabourHour < 20) {
    realSignals.push({ label: "Rev / hour", status: "critical", detail: `£${props.revenuePerLabourHour.toFixed(0)} — well below £30 target` });
  } else if (props.revenuePerLabourHour < 30) {
    realSignals.push({ label: "Rev / hour", status: "at_risk", detail: `£${props.revenuePerLabourHour.toFixed(0)} — below £30 target` });
  } else {
    realSignals.push({ label: "Rev / hour", status: "on_track", detail: `£${props.revenuePerLabourHour.toFixed(0)} — meeting target` });
  }

  if (props.comparePrevious) {
    if (props.revenueTrend < -10) {
      realSignals.push({ label: "Sales trend", status: "critical", detail: `${props.revenueTrend.toFixed(1)}% vs previous` });
    } else if (props.revenueTrend < 0) {
      realSignals.push({ label: "Sales trend", status: "at_risk", detail: `${props.revenueTrend.toFixed(1)}% vs previous` });
    } else {
      realSignals.push({ label: "Sales trend", status: "on_track", detail: `+${props.revenueTrend.toFixed(1)}% vs previous` });
    }
  }

  // ─── Estimated signals ───
  const estimatedSignals: Signal[] = [];
  if (props.operatingMarginPct < 5) {
    estimatedSignals.push({ label: "Est. margin", status: "critical", detail: `${props.operatingMarginPct.toFixed(1)}% — below 10% target` });
  } else if (props.operatingMarginPct < 10) {
    estimatedSignals.push({ label: "Est. margin", status: "at_risk", detail: `${props.operatingMarginPct.toFixed(1)}% — below 10% target` });
  } else {
    estimatedSignals.push({ label: "Est. margin", status: "on_track", detail: `${props.operatingMarginPct.toFixed(1)}% — meeting target` });
  }

  // Overall status from REAL signals only
  const overall = getOverallStatus(realSignals);
  const cfg = statusConfig[overall];
  const OverallIcon = cfg.icon;

  return (
    <div className="space-y-2">
      {/* Real signals — drives overall status */}
      <div className={cn("rounded-lg border p-3", cfg.border, cfg.bg)}>
        <div className="flex items-center gap-2 mb-2">
          <OverallIcon className={cn("h-4 w-4", cfg.color)} />
          <span className={cn("text-sm font-bold", cfg.color)}>{cfg.label}</span>
          <span className="text-[10px] text-muted-foreground ml-auto">Based on live data only</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {realSignals.map((s) => <SignalRow key={s.label} signal={s} />)}
        </div>
      </div>

      {/* Estimated signals — separate and clearly labelled */}
      {estimatedSignals.length > 0 && (
        <div className="rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 p-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertTriangle className="h-3 w-3 text-amber-600" />
            <span className="text-[10px] font-semibold text-amber-700">Estimated signals</span>
            <span className="text-[9px] text-amber-600/70 ml-auto">Based on industry averages</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {estimatedSignals.map((s) => <SignalRow key={s.label} signal={s} />)}
          </div>
        </div>
      )}
    </div>
  );
}
