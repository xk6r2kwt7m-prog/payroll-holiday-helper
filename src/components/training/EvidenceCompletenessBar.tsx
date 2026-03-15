/**
 * Compact evidence completeness indicator for admin module views.
 * Shows derived status + "Mark Reviewed" action + completeness criteria.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Clock, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  useModuleEvidence,
  useMarkModuleReviewed,
  deriveEvidenceCompleteness,
  COMPLETENESS_LABELS,
} from "@/hooks/useModuleEvidence";
import { isReviewStale, STALE_REVIEW_THRESHOLD_DAYS } from "@/lib/review-governance";

interface Props {
  documentId: string;
  lastReviewedAt: string | null;
  lastReviewedBy: string | null;
  canEdit: boolean;
}

export function EvidenceCompletenessBar({ documentId, lastReviewedAt, canEdit }: Props) {
  const { data: evidence = [] } = useModuleEvidence(documentId);
  const markReviewed = useMarkModuleReviewed();

  const stale = isReviewStale(lastReviewedAt);
  // If stale, pass null for review date so completeness downgrades
  const effectiveReviewDate = stale ? null : lastReviewedAt;
  const status = deriveEvidenceCompleteness(evidence, effectiveReviewDate);
  const config = COMPLETENESS_LABELS[status];

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={cn("text-[10px] gap-1", config.color)}>
          <ShieldCheck className="h-3 w-3" />
          {config.label}
        </Badge>
        {lastReviewedAt && (
          <span className={cn("text-[9px] flex items-center gap-1", stale ? "text-warning" : "text-muted-foreground")}>
            {stale && <AlertTriangle className="h-3 w-3" />}
            <Clock className="h-3 w-3" />
            Reviewed {format(parseISO(lastReviewedAt), "d MMM yyyy")}
            {stale && " (stale)"}
          </span>
        )}
        {canEdit && (
          <Button
            variant="ghost" size="sm"
            className="h-5 text-[10px] px-2 ml-auto"
            onClick={() => markReviewed.mutate(documentId)}
            disabled={markReviewed.isPending}
          >
            {markReviewed.isPending ? "…" : "Mark Reviewed"}
          </Button>
        )}
      </div>
      {/* Criteria hint for non-ready statuses */}
      {status !== "ready_for_use" && status !== "no_evidence" && (
        <p className="text-[9px] text-muted-foreground italic">
          {status === "partial_evidence" && (stale
            ? `Review is older than ${STALE_REVIEW_THRESHOLD_DAYS} days — re-review to progress.`
            : "Needs review mark to progress.")}
          {status === "evidence_reviewed" && "Needs 2+ sources, one high-confidence, and one official/mixed type."}
        </p>
      )}
    </div>
  );
}
