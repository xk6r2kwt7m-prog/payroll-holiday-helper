/**
 * Compact evidence completeness indicator for admin module views.
 * Shows derived status + "Mark Reviewed" action + completeness criteria.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Clock, AlertTriangle } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import {
  useModuleEvidence,
  useMarkModuleReviewed,
  deriveEvidenceCompleteness,
  COMPLETENESS_LABELS,
} from "@/hooks/useModuleEvidence";

interface Props {
  documentId: string;
  lastReviewedAt: string | null;
  lastReviewedBy: string | null;
  canEdit: boolean;
}

export function EvidenceCompletenessBar({ documentId, lastReviewedAt, canEdit }: Props) {
  const { data: evidence = [] } = useModuleEvidence(documentId);
  const markReviewed = useMarkModuleReviewed();

  const status = deriveEvidenceCompleteness(evidence, lastReviewedAt);
  const config = COMPLETENESS_LABELS[status];

  // Stale review warning: >180 days since last review
  const isStale = lastReviewedAt && differenceInDays(new Date(), parseISO(lastReviewedAt)) > 180;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={cn("text-[10px] gap-1", config.color)}>
          <ShieldCheck className="h-3 w-3" />
          {config.label}
        </Badge>
        {lastReviewedAt && (
          <span className={cn("text-[9px] flex items-center gap-1", isStale ? "text-warning" : "text-muted-foreground")}>
            {isStale && <AlertTriangle className="h-3 w-3" />}
            <Clock className="h-3 w-3" />
            Reviewed {format(parseISO(lastReviewedAt), "d MMM yyyy")}
            {isStale && " (stale)"}
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
          {status === "partial_evidence" && "Needs review mark to progress."}
          {status === "evidence_reviewed" && "Needs 2+ sources, one high-confidence, and one official/mixed type."}
        </p>
      )}
    </div>
  );
}
