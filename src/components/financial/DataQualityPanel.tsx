import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataSource {
  label: string;
  status: "live" | "estimated" | "not_connected";
  detail?: string;
}

const statusConfig = {
  live: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-500/10", label: "Live from system" },
  estimated: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-500/10", label: "Estimated" },
  not_connected: { icon: XCircle, color: "text-muted-foreground", bg: "bg-muted", label: "Not connected" },
};

export function DataQualityPanel({ sources }: { sources: DataSource[] }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Data Source Status
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
        {sources.map((s) => {
          const cfg = statusConfig[s.status];
          const Icon = cfg.icon;
          return (
            <div key={s.label} className="flex items-center gap-1.5">
              <Icon className={cn("h-3 w-3 shrink-0", cfg.color)} />
              <span className="text-[11px] text-foreground">{s.label}</span>
              <span className={cn("text-[9px] ml-auto", cfg.color)}>{cfg.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Small inline badge for estimated/not-connected labels */
export function EstimatedBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[9px] font-medium text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded px-1 py-0.5 leading-none", className)}>
      <AlertTriangle className="h-2 w-2" />
      Est.
    </span>
  );
}

export function NotConnectedBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[9px] font-medium text-muted-foreground bg-muted border border-border rounded px-1 py-0.5 leading-none", className)}>
      <XCircle className="h-2 w-2" />
      N/A
    </span>
  );
}
