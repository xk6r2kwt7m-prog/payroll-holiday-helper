/**
 * Compact admin-only governance summary for a training module.
 * Shows evidence count, insight count, review status, readiness, and top issue at a glance.
 */

import { Badge } from "@/components/ui/badge";
import { BookOpen, Eye, ShieldCheck, AlertTriangle, Clock, Info } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { getReviewState, REVIEW_STATE_CONFIG } from "@/lib/review-governance";
import {
  deriveEvidenceCompleteness,
  COMPLETENESS_LABELS,
  type ModuleEvidence,
} from "@/hooks/useModuleEvidence";
import type { GovernanceCounts } from "@/hooks/useGovernanceSummary";

interface Props {
  lastReviewedAt: string | null;
  counts: GovernanceCounts;
  evidence: ModuleEvidence[];
}

export function ModuleGovernanceSummary({ lastReviewedAt, counts, evidence }: Props) {
  const reviewState = getReviewState(lastReviewedAt);
  const reviewConfig = REVIEW_STATE_CONFIG[reviewState];
  const completeness = deriveEvidenceCompleteness(evidence, lastReviewedAt);
  const completenessConfig = COMPLETENESS_LABELS[completeness];

  // Governance warnings
  const warnings: string[] = [];
  if (reviewState === "current" && counts.evidenceCount === 0) {
    warnings.push("Marked reviewed but has no evidence sources.");
  }
  if (counts.insightCount > 0 && counts.evidenceCount === 0) {
    warnings.push("Has review insights but no supporting evidence.");
  }
  if (counts.evidenceCount > 0 && counts.insightCount === 0 && completeness !== "ready_for_use") {
    warnings.push("Evidence exists but no review insights link it to training needs.");
  }

  // Top issue — first warning as scannable headline
  const topIssue = warnings.length > 0 ? warnings[0] : null;

  return (
    <div className="space-y-1.5 rounded-lg border border-border bg-muted/10 p-2.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Standards Governance</p>

      {/* Top issue */}
      {topIssue && (
        <div className="flex items-start gap-1.5 rounded-md bg-warning/5 border border-warning/20 px-2 py-1">
          <Info className="h-3 w-3 text-warning shrink-0 mt-px" />
          <p className="text-[10px] font-medium text-warning">{topIssue}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline" className="text-[9px] gap-1">
          <BookOpen className="h-2.5 w-2.5" />
          {counts.evidenceCount} evidence
        </Badge>

        <Badge variant="outline" className="text-[9px] gap-1">
          <Eye className="h-2.5 w-2.5" />
          {counts.insightCount} insight{counts.insightCount !== 1 ? "s" : ""}
        </Badge>

        <Badge className={cn("text-[9px] gap-1", reviewConfig.color)}>
          <Clock className="h-2.5 w-2.5" />
          {reviewConfig.label}
          {lastReviewedAt && reviewState !== "never" && (
            <span className="ml-0.5 font-normal">({format(parseISO(lastReviewedAt), "d MMM yy")})</span>
          )}
        </Badge>

        <Badge className={cn("text-[9px] gap-1", completenessConfig.color)}>
          <ShieldCheck className="h-2.5 w-2.5" />
          {completenessConfig.label}
        </Badge>
      </div>

      {/* Remaining warnings (skip topIssue which is already shown) */}
      {warnings.length > 1 && (
        <div className="space-y-0.5 pt-0.5">
          {warnings.slice(1).map((w, i) => (
            <p key={i} className="text-[9px] text-warning flex items-start gap-1">
              <AlertTriangle className="h-2.5 w-2.5 shrink-0 mt-px" /> {w}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
