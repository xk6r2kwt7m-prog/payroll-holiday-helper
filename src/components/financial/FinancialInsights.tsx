import { Lightbulb, CheckCircle2, AlertTriangle, XCircle, Info, ArrowRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface Insight {
  type: "success" | "warning" | "danger" | "info";
  text: string;
  estimated?: boolean;
  action?: string;
  site?: string;
  link?: string;
}

const iconMap = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  info: Info,
};

const colorMap = {
  success: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
  warning: "text-amber-600 bg-amber-500/10 border-amber-500/20",
  danger: "text-red-600 bg-red-500/10 border-red-500/20",
  info: "text-blue-600 bg-blue-500/10 border-blue-500/20",
};

export function FinancialInsights({ insights }: { insights: Insight[] }) {
  const navigate = useNavigate();

  if (!insights.length) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Lightbulb className="h-4 w-4 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">All Insights</h3>
        <span className="text-[9px] text-muted-foreground ml-auto">Based on connected data only</span>
      </div>
      <div className="space-y-2">
        {insights.map((insight, i) => {
          const Icon = iconMap[insight.type];
          return (
            <div
              key={i}
              className={cn("rounded-md border px-3 py-2 text-xs", colorMap[insight.type])}
            >
              <div className="flex items-start gap-2">
                <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {insight.estimated && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded px-1 py-0.5 leading-none">
                        Est.
                      </span>
                    )}
                    {insight.site && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-foreground bg-muted border border-border rounded px-1 py-0.5 leading-none">
                        {insight.site}
                      </span>
                    )}
                  </div>
                  <span className="leading-relaxed">{insight.text}</span>
                  {insight.action && (
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center gap-1 text-[10px] font-medium opacity-80">
                        <ArrowRight className="h-2.5 w-2.5" />
                        <span>{insight.action}</span>
                      </div>
                      {insight.link && (
                        <button
                          onClick={() => navigate(insight.link!)}
                          className="flex items-center gap-0.5 text-[9px] font-medium opacity-70 hover:opacity-100 hover:underline"
                        >
                          <ExternalLink className="h-2.5 w-2.5" />
                          View
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
