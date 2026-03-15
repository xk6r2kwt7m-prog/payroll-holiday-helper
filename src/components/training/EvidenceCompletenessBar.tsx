/**
 * Compact evidence completeness indicator for admin module views.
 * Shows derived status + "Mark Reviewed" action.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
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

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge className={cn("text-[10px] gap-1", config.color)}>
        <ShieldCheck className="h-3 w-3" />
        {config.label}
      </Badge>
      {lastReviewedAt && (
        <span className="text-[9px] text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Reviewed {format(parseISO(lastReviewedAt), "d MMM yyyy")}
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
  );
}
