import { AlertTriangle, XCircle, Info, ArrowRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import type { PriorityAction } from "@/hooks/useFinancialData";

const urgencyConfig = {
  critical: { icon: XCircle, color: "text-red-600", bg: "bg-red-500/10", border: "border-red-500/20", label: "Critical" },
  at_risk: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-500/10", border: "border-amber-500/20", label: "At Risk" },
  info: { icon: Info, color: "text-blue-600", bg: "bg-blue-500/10", border: "border-blue-500/20", label: "Info" },
};

export function PriorityActions({ actions }: { actions: PriorityAction[] }) {
  const navigate = useNavigate();

  if (!actions.length) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-7 w-7 rounded-lg bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Priority Actions</h3>
        <span className="text-[9px] text-muted-foreground ml-auto">Top 3 by urgency</span>
      </div>
      <div className="space-y-2">
        {actions.map((a, i) => {
          const cfg = urgencyConfig[a.urgency];
          const Icon = cfg.icon;
          return (
            <div
              key={i}
              className={cn("rounded-md border px-3 py-2.5", cfg.bg, cfg.border)}
            >
              <div className="flex items-start gap-2">
                <Icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", cfg.color)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={cn("text-[9px] font-bold uppercase tracking-wider", cfg.color)}>{cfg.label}</span>
                    {a.site && (
                      <span className="text-[9px] font-medium text-foreground bg-muted border border-border rounded px-1 py-0.5 leading-none">
                        {a.site}
                      </span>
                    )}
                    {a.estimated && (
                      <span className="text-[9px] font-medium text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded px-1 py-0.5 leading-none">
                        Est.
                      </span>
                    )}
                  </div>
                  <p className={cn("text-xs mt-0.5 leading-relaxed", cfg.color)}>
                    {a.text}
                  </p>
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="flex items-center gap-1 text-[10px] font-medium opacity-80">
                      <ArrowRight className={cn("h-2.5 w-2.5", cfg.color)} />
                      <span className={cfg.color}>{a.action}</span>
                    </div>
                    {a.link && (
                      <button
                        onClick={() => navigate(a.link!)}
                        className={cn("flex items-center gap-0.5 text-[9px] font-medium hover:underline", cfg.color)}
                      >
                        <ExternalLink className="h-2.5 w-2.5" />
                        Go
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
