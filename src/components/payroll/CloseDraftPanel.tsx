import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckCircle2,
  ShieldAlert,
  AlertTriangle,
  Lock,
  ArrowRight,
} from "lucide-react";
import { APPROVAL_CONFIRMATION_TEXT } from "@/lib/payroll-approval-checklist";
import type { DerivedPanelItem } from "@/lib/payroll-page-severity";

/**
 * "Close this draft" — a single, compact panel that gathers the three steps
 * required to close a payroll period into one place:
 *   1. Clear blockers
 *   2. Acknowledge warnings that require sign-off
 *   3. Confirm and submit / approve
 *
 * Purely presentational. It never mutates payroll data and never bypasses
 * the existing approval gates — it only surfaces the same state and calls
 * the same handlers the detailed sections already use.
 */
export interface CloseDraftPanelProps {
  periodStatus: string;
  canAct: boolean;
  blockers: DerivedPanelItem[];
  ackItems: DerivedPanelItem[];
  acknowledged: Set<string>;
  onAcknowledgedChange: (next: Set<string>) => void;
  confirmed: boolean;
  onConfirmedChange: (next: boolean) => void;
  onSubmitForReview: () => void;
  onApprove: () => void;
  isSubmitting?: boolean;
  isApproving?: boolean;
  blockedReason?: string | null;
  /** Admin override — opens the audited bypass dialog. */
  onOverride?: (mode: "submit" | "approve") => void;
}


function StepRow({
  index,
  title,
  done,
  tone,
  children,
}: {
  index: number;
  title: string;
  done: boolean;
  tone: "blocker" | "warning" | "neutral";
  children?: React.ReactNode;
}) {
  return (
    <div className="flex gap-2.5">
      <div
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
          done
            ? "bg-success/15 text-success"
            : tone === "blocker"
              ? "bg-destructive/10 text-destructive"
              : tone === "warning"
                ? "bg-warning/10 text-warning"
                : "bg-muted text-muted-foreground",
        )}
      >
        {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : index}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {children}
      </div>
    </div>
  );
}

export function CloseDraftPanel({
  periodStatus,
  canAct,
  blockers,
  ackItems,
  acknowledged,
  onAcknowledgedChange,
  confirmed,
  onConfirmedChange,
  onSubmitForReview,
  onApprove,
  isSubmitting,
  isApproving,
  blockedReason,
  onOverride,
}: CloseDraftPanelProps) {
  if (periodStatus === "approved") {


    return (
      <div
        className="rounded-xl border border-success/30 bg-success/5 p-3 sm:p-4"
        data-testid="close-draft-panel"
      >
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-success" />
          <p className="text-sm font-medium text-foreground">
            Period approved and locked
          </p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Reopen the period below if a correction is needed. All changes stay
          audited.
        </p>
      </div>
    );
  }

  const pendingAcks = ackItems.filter((i) => !acknowledged.has(stripId(i.id)));
  const blockersClear = blockers.length === 0;
  const acksClear = pendingAcks.length === 0;
  const isPending = periodStatus === "pending";

  const toggleAck = (rawId: string, checked: boolean) => {
    const id = stripId(rawId);
    const next = new Set(acknowledged);
    if (checked) next.add(id);
    else next.delete(id);
    onAcknowledgedChange(next);
  };

  const acknowledgeAll = () => {
    const next = new Set(acknowledged);
    for (const item of ackItems) next.add(stripId(item.id));
    onAcknowledgedChange(next);
  };

  return (
    <div
      className="rounded-xl border border-border/60 bg-card shadow-card p-3 sm:p-4 space-y-3"
      data-testid="close-draft-panel"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">
          Close this payroll period
        </p>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] px-1.5 py-0",
            blockersClear && acksClear
              ? "bg-success/10 text-success"
              : "bg-muted text-muted-foreground",
          )}
          data-testid="close-draft-progress"
        >
          {[blockersClear, acksClear, confirmed].filter(Boolean).length}/3 steps
        </Badge>
      </div>

      {/* Step 1 — blockers */}
      <StepRow
        index={1}
        title={
          blockersClear
            ? "No blockers"
            : `Clear ${blockers.length} blocker${blockers.length === 1 ? "" : "s"}`
        }
        done={blockersClear}
        tone="blocker"
      >
        {!blockersClear && (
          <ul className="mt-1 space-y-0.5" data-testid="close-draft-blockers">
            {blockers.slice(0, 4).map((b) => (
              <li
                key={b.id}
                className="flex items-start gap-1.5 text-xs text-muted-foreground"
              >
                <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0 text-destructive" />
                <span>
                  {b.title}
                  {typeof b.count === "number" && b.count > 0 ? ` (${b.count})` : ""}
                </span>
              </li>
            ))}
            {blockers.length > 4 && (
              <li className="text-xs text-muted-foreground">
                +{blockers.length - 4} more in Action Required below
              </li>
            )}
          </ul>
        )}
      </StepRow>

      {/* Step 2 — acknowledgements */}
      <StepRow
        index={2}
        title={
          ackItems.length === 0
            ? "Nothing to acknowledge"
            : acksClear
              ? `All ${ackItems.length} warning${ackItems.length === 1 ? "" : "s"} acknowledged`
              : `Acknowledge ${pendingAcks.length} warning${pendingAcks.length === 1 ? "" : "s"}`
        }
        done={acksClear}
        tone="warning"
      >
        {!acksClear && (
          <div className="mt-1 space-y-1.5" data-testid="close-draft-acks">
            {pendingAcks.map((item) => (
              <label
                key={item.id}
                className="flex items-start gap-2 text-xs text-muted-foreground"
              >
                <Checkbox
                  className="mt-0.5"
                  checked={false}
                  disabled={!canAct}
                  onCheckedChange={(v) => toggleAck(item.id, v === true)}
                  aria-label={`Acknowledge ${item.title}`}
                />
                <span className="flex items-start gap-1.5">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
                  <span>{item.title}</span>
                </span>
              </label>
            ))}
            {pendingAcks.length > 1 && canAct && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={acknowledgeAll}
                data-testid="close-draft-ack-all"
              >
                Acknowledge all reviewed
              </Button>
            )}
          </div>
        )}
      </StepRow>

      {/* Step 3 — confirm + act */}
      <StepRow
        index={3}
        title={isPending ? "Confirm and approve" : "Submit for review"}
        done={isPending ? confirmed : false}
        tone="neutral"
      >
        {isPending ? (
          <label className="mt-1 flex items-start gap-2 text-xs text-muted-foreground">
            <Checkbox
              className="mt-0.5"
              checked={confirmed}
              disabled={!canAct}
              onCheckedChange={(v) => onConfirmedChange(v === true)}
              aria-label="Confirm payroll approval"
              data-testid="close-draft-confirm"
            />
            <span>{APPROVAL_CONFIRMATION_TEXT}</span>
          </label>
        ) : (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Moves the period to pending review so it can be approved and locked.
          </p>
        )}
      </StepRow>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {isPending ? (
          <Button
            size="sm"
            className="h-8"
            onClick={onApprove}
            disabled={!canAct || !!blockedReason || isApproving}
            data-testid="close-draft-approve"
          >
            <Lock className="mr-1.5 h-3.5 w-3.5" />
            {isApproving ? "Approving…" : "Approve & lock"}
          </Button>
        ) : (
          <Button
            size="sm"
            className="h-8"
            onClick={onSubmitForReview}
            disabled={!canAct || !blockersClear || isSubmitting}
            data-testid="close-draft-submit"
          >
            {isSubmitting ? "Submitting…" : "Submit for review"}
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        )}
        {canAct && onOverride && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={() => onOverride("approve")}
            disabled={isApproving || isSubmitting}
            data-testid="close-draft-override"
          >
            <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />
            Override & approve
          </Button>
        )}

        {blockedReason && (
          <p className="text-xs text-muted-foreground" data-testid="close-draft-blocked-reason">
            {blockedReason}
          </p>
        )}
        {canAct && onOverride && (
          <p className="w-full text-[11px] text-muted-foreground">
            Overrides require a written reason and are recorded in the payroll audit trail.
          </p>
        )}

      </div>
    </div>
  );
}

/** Severity items are prefixed with `checklist_`; acks use the raw item id. */
function stripId(id: string) {
  return id.startsWith("checklist_") ? id.slice("checklist_".length) : id;
}
