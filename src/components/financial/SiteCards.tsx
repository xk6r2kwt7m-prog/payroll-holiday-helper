import { MapPin, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SiteMetrics } from "@/hooks/useFinancialData";

function fmt(n: number) {
  if (Math.abs(n) >= 1000) return `£${(n / 1000).toFixed(1)}k`;
  return `£${n.toFixed(0)}`;
}

export function SiteCards({ sites }: { sites: SiteMetrics[] }) {
  if (!sites.length) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center">
        <p className="text-xs text-muted-foreground">No site-level data available for this period</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <MapPin className="h-4 w-4 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Site Overview</h3>
        <span className="text-[9px] text-muted-foreground ml-auto">Labour data live • Revenue per site not connected</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {sites.map((site) => (
          <div key={site.branch} className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <MapPin className="h-3 w-3 text-primary shrink-0" />
              <span className="text-xs font-semibold text-foreground truncate">{site.displayName}</span>
            </div>

            <div className="space-y-1.5">
              {/* Labour cost — REAL */}
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Labour cost</span>
                <span className="font-medium text-foreground tabular-nums">{fmt(site.labourCost)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Hours</span>
                <span className="font-medium text-foreground tabular-nums">{site.labourHours.toFixed(1)}h</span>
              </div>

              {/* Revenue — not connected */}
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Sales</span>
                <span className="text-muted-foreground/60 italic text-[9px]">Waiting for data</span>
              </div>

              {/* Labour % — requires revenue */}
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Labour %</span>
                <span className="text-muted-foreground/60 italic text-[9px]">Needs revenue</span>
              </div>

              {/* Profit status — requires revenue + COGS */}
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Profit status</span>
                <span className="text-muted-foreground/60 italic text-[9px]">Not connected</span>
              </div>
            </div>

            {/* Alerts */}
            {site.alerts.length > 0 && (
              <div className="mt-2 space-y-1">
                {site.alerts.map((alert, i) => (
                  <div key={i} className={cn(
                    "flex items-start gap-1 text-[9px] rounded px-1.5 py-1",
                    alert.type === "danger" ? "text-red-600 bg-red-500/10" :
                    alert.type === "warning" ? "text-amber-600 bg-amber-500/10" :
                    "text-blue-600 bg-blue-500/10"
                  )}>
                    <AlertTriangle className="h-2.5 w-2.5 mt-0.5 shrink-0" />
                    <span>{alert.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
