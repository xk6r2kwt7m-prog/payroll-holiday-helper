/**
 * Admin-only module-level signal quality summary panel.
 * Shows quality status, dimensional breakdown, and recommendation.
 * Appears in the Standards tab of the module detail sheet.
 */

import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, ShieldAlert, AlertTriangle, Copy,
  Crosshair, BarChart3, MessageCircleWarning,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  QUALITY_STATUS_COLORS,
  QUALITY_STATUS_LABELS,
  type SignalQualityRecord,
} from "@/lib/signal-quality";

interface Props {
  quality: SignalQualityRecord | null;
}

function getStatusIcon(status: string) {
  switch (status) {
    case "strong": return <ShieldCheck className="h-3.5 w-3.5" />;
    case "acceptable": return <ShieldCheck className="h-3.5 w-3.5" />;
    case "weak": return <AlertTriangle className="h-3.5 w-3.5" />;
    case "unreliable": return <ShieldAlert className="h-3.5 w-3.5" />;
    default: return null;
  }
}

export function ModuleSignalQualityPanel({ quality }: Props) {
  if (!quality) return null;

  const dimensions = [
    { label: "Volume", value: quality.scores.volume, level: quality.volumeLevel },
    { label: "Specificity", value: quality.scores.specificity, flag: quality.vaguenessFlag ? "Vague" : null },
    { label: "Attribution", value: quality.scores.attribution, level: quality.attributionStrength },
    { label: "Recency", value: quality.scores.recency },
    { label: "Source", value: quality.scores.sourceStrength, level: quality.evidenceStrength },
  ];

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Signal Quality
      </p>

      <div className="rounded-lg border border-border bg-muted/30 p-2.5 space-y-2">
        {/* Status + score */}
        <div className="flex items-center gap-2">
          <span className={cn("shrink-0", QUALITY_STATUS_COLORS[quality.qualityStatus].split(" ")[1])}>
            {getStatusIcon(quality.qualityStatus)}
          </span>
          <Badge className={cn("text-[9px] px-1.5 py-0", QUALITY_STATUS_COLORS[quality.qualityStatus])}>
            {QUALITY_STATUS_LABELS[quality.qualityStatus]}
          </Badge>
          <span className="text-[9px] text-muted-foreground ml-auto tabular-nums">
            Score: {quality.scores.composite}/100
          </span>
        </div>

        {/* Dimension bars */}
        <div className="space-y-1">
          {dimensions.map(dim => (
            <div key={dim.label} className="flex items-center gap-2 text-[9px]">
              <span className="text-muted-foreground w-16 shrink-0">{dim.label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    dim.value >= 70 ? "bg-success" :
                    dim.value >= 40 ? "bg-primary" :
                    dim.value >= 25 ? "bg-warning" : "bg-destructive",
                  )}
                  style={{ width: `${Math.min(100, dim.value)}%` }}
                />
              </div>
              <span className="text-muted-foreground tabular-nums w-6 text-right">{dim.value}</span>
              {dim.flag && (
                <Badge variant="outline" className="text-[7px] px-1 py-0 text-warning">{dim.flag}</Badge>
              )}
            </div>
          ))}
        </div>

        {/* Flags row */}
        <div className="flex flex-wrap gap-1">
          {quality.duplicateRisk !== "low" && (
            <Badge variant="outline" className={cn("text-[8px] px-1 py-0 gap-0.5",
              quality.duplicateRisk === "high" ? "text-destructive" : "text-warning"
            )}>
              <Copy className="h-2.5 w-2.5" /> {quality.duplicateRisk} dupe risk
            </Badge>
          )}
          {quality.vaguenessFlag && (
            <Badge variant="outline" className="text-[8px] px-1 py-0 text-warning gap-0.5">
              <MessageCircleWarning className="h-2.5 w-2.5" /> Vague
            </Badge>
          )}
          {quality.attributionStrength === "weak" && (
            <Badge variant="outline" className="text-[8px] px-1 py-0 text-muted-foreground gap-0.5">
              <Crosshair className="h-2.5 w-2.5" /> Weak attribution
            </Badge>
          )}
          {quality.volumeLevel === "low" && (
            <Badge variant="outline" className="text-[8px] px-1 py-0 text-muted-foreground gap-0.5">
              <BarChart3 className="h-2.5 w-2.5" /> Low volume
            </Badge>
          )}
        </div>

        {/* Top weakness + recommendation */}
        <div className="space-y-0.5">
          <p className="text-[9px] text-muted-foreground">
            <span className="font-medium">Top issue:</span> {quality.topWeakness}
          </p>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            {quality.recommendation}
          </p>
        </div>
      </div>
    </div>
  );
}
