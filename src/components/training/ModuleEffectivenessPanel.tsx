/**
 * Admin-only module-level effectiveness detail panel.
 * Shows baseline vs post comparison, trend label, and recommendation.
 * Appears in the Standards tab of the module detail sheet.
 */

import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, HelpCircle, Zap, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import {
  computeEffectiveness,
  SCORE_LABELS,
  SCORE_COLORS,
  RESULT_LABELS,
  getModuleSignalTypes,
  type EffectivenessRecord,
  type EffectivenessScore,
} from "@/lib/training-effectiveness";
import { REVIEW_INSIGHT_LABELS, type ReviewInsightTag } from "@/data/training-standards/types";

interface Props {
  /** Most recent effectiveness record for this module, if any */
  record: EffectivenessRecord | null;
  /** All records for this module (for location breakdown) */
  allRecords: EffectivenessRecord[];
  /** Module's review_insight_tags from standards_metadata */
  reviewInsightTags: ReviewInsightTag[] | undefined | null;
}

function getScoreIcon(score: EffectivenessScore) {
  switch (score) {
    case "strong_positive": return <Zap className="h-3.5 w-3.5" />;
    case "positive": return <TrendingUp className="h-3.5 w-3.5" />;
    case "neutral": return <Minus className="h-3.5 w-3.5" />;
    case "negative": return <TrendingDown className="h-3.5 w-3.5" />;
    case "insufficient": return <HelpCircle className="h-3.5 w-3.5" />;
  }
}

export function ModuleEffectivenessPanel({ record, allRecords, reviewInsightTags }: Props) {
  const signalTypes = getModuleSignalTypes(reviewInsightTags);

  // If no record and no signal types, show nothing
  if (!record && signalTypes.length === 0) return null;

  // Compute effectiveness from the record
  const effectiveness = record
    ? computeEffectiveness({
        baselineCount: record.baseline_signal_count,
        postCount: record.post_training_signal_count,
        evaluationType: record.evaluation_type as any,
      })
    : null;

  // Location breakdown (only location_level records)
  const locationRecords = allRecords.filter(r => r.evaluation_type === "location_level" && r.location_id);

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Training Effectiveness
      </p>

      {/* Linked signal types */}
      {signalTypes.length > 0 && (
        <div className="space-y-1">
          <p className="text-[9px] text-muted-foreground">Linked operational signals:</p>
          <div className="flex flex-wrap gap-1">
            {signalTypes.map(tag => (
              <Badge key={tag} variant="outline" className="text-[9px] px-1.5 py-0">
                {REVIEW_INSIGHT_LABELS[tag] ?? tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Main effectiveness result */}
      {effectiveness && record ? (
        <div className="rounded-lg border border-border bg-muted/30 p-2.5 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className={cn("shrink-0", effectiveness.score === "negative" ? "text-destructive" : effectiveness.score === "insufficient" ? "text-muted-foreground" : "text-success")}>
              {getScoreIcon(effectiveness.score)}
            </span>
            <Badge className={cn("text-[9px] px-1.5 py-0", SCORE_COLORS[effectiveness.score])}>
              {effectiveness.label}
            </Badge>
            <Badge variant="outline" className="text-[8px] px-1 py-0 ml-auto">
              {record.confidence_level} confidence
            </Badge>
          </div>

          {/* Baseline vs Post comparison */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[9px] text-muted-foreground">Baseline</p>
              <p className="text-sm font-bold tabular-nums text-foreground">{record.baseline_signal_count}</p>
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground">Post-training</p>
              <p className="text-sm font-bold tabular-nums text-foreground">{record.post_training_signal_count}</p>
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground">Change</p>
              <p className={cn(
                "text-sm font-bold tabular-nums",
                effectiveness.deltaPercent < 0 ? "text-success" : effectiveness.deltaPercent > 0 ? "text-destructive" : "text-muted-foreground",
              )}>
                {effectiveness.deltaPercent > 0 ? "+" : ""}{effectiveness.deltaPercent}%
              </p>
            </div>
          </div>

          {/* Recommendation */}
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            {effectiveness.recommendation}
          </p>

          {/* Measured date */}
          <p className="text-[9px] text-muted-foreground/60">
            Measured {format(parseISO(record.measured_at), "d MMM yyyy")} · {record.evaluation_window_days}-day window
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-muted/30 p-2.5">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground">
              No effectiveness data yet. Results will appear once operational signals are measured against training completion windows.
            </p>
          </div>
        </div>
      )}

      {/* Location breakdown */}
      {locationRecords.length > 0 && (
        <div className="space-y-1">
          <p className="text-[9px] font-medium text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" /> By Location
          </p>
          <div className="space-y-0.5">
            {locationRecords.map(lr => {
              const eff = computeEffectiveness({
                baselineCount: lr.baseline_signal_count,
                postCount: lr.post_training_signal_count,
                evaluationType: lr.evaluation_type as any,
              });
              return (
                <div key={lr.id} className="flex items-center justify-between text-[10px] px-2 py-1 rounded bg-background border border-border">
                  <span className="text-foreground truncate">{lr.location_id?.slice(0, 8)}…</span>
                  <div className="flex items-center gap-1.5">
                    <Badge className={cn("text-[8px] px-1 py-0", SCORE_COLORS[eff.score])}>
                      {eff.label}
                    </Badge>
                    <span className={cn(
                      "tabular-nums font-medium",
                      eff.deltaPercent < 0 ? "text-success" : eff.deltaPercent > 0 ? "text-destructive" : "text-muted-foreground",
                    )}>
                      {eff.deltaPercent > 0 ? "+" : ""}{eff.deltaPercent}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
