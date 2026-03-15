/**
 * Compact admin-only governance summary for a training module.
 * Shows evidence count, insight count, review status, and readiness at a glance.
 */

import { Badge } from "@/components/ui/badge";
import { BookOpen, Eye, ShieldCheck, AlertTriangle, Clock } from "lucide-react";
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

  return (
    <div className="space-y-1.5 rounded-lg border border-border bg-muted/10 p-2.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Standards Governance</p>

      <div className="flex flex-wrap gap-1.5">
        {/* Evidence count */}
        <Badge variant="outline" className="text-[9px] gap-1">
          <BookOpen className="h-2.5 w-2.5" />
          {counts.evidenceCount} evidence
        </Badge>

        {/* Insight count */}
        <Badge variant="outline" className="text-[9px] gap-1">
          <Eye className="h-2.5 w-2.5" />
          {counts.insightCount} insight{counts.insightCount !== 1 ? "s" : ""}
        </Badge>

        {/* Review state */}
        <Badge className={cn("text-[9px] gap-1", reviewConfig.color)}>
          <Clock className="h-2.5 w-2.5" />
          {reviewConfig.label}
          {lastReviewedAt && reviewState !== "never" && (
            <span className="ml-0.5 font-normal">({format(parseISO(lastReviewedAt), "d MMM yy")})</span>
          )}
        </Badge>

        {/* Readiness */}
        <Badge className={cn("text-[9px] gap-1", completenessConfig.color)}>
          <ShieldCheck className="h-2.5 w-2.5" />
          {completenessConfig.label}
        </Badge>
      </div>

      {/* Governance warnings */}
      {warnings.length > 0 && (
        <div className="space-y-0.5 pt-0.5">
          {warnings.map((w, i) => (
            <p key={i} className="text-[9px] text-warning flex items-start gap-1">
              <AlertTriangle className="h-2.5 w-2.5 shrink-0 mt-px" /> {w}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
