/**
 * Phase 5 — Payroll approval readiness checklist (UI surface).
 *
 * Read-only. Surfaces blocking issues and warnings from
 * `buildApprovalChecklist`, plus per-warning acknowledgement checkboxes
 * and the standard approval-confirmation text. Approval itself is
 * triggered by the parent — this component never mutates payroll data.
 *
 * Use alongside the existing PayrollApprovalWorkflow audit gate.
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Lock, ShieldX } from "lucide-react";
import {
  buildApprovalChecklist,
  canApprove,
  APPROVAL_CONFIRMATION_TEXT,
  type ApprovalChecklistInput,
  type ChecklistItem,
} from "@/lib/payroll-approval-checklist";

interface Props extends ApprovalChecklistInput {
  /** Manager/admin/payroll-authorised user. Non-authorised users see read-only. */
  canApproveRole: boolean;
  isApproving?: boolean;
  /** Parent triggers the actual approve mutation (with its own audit). */
  onApproveRequested: (acknowledgedIds: string[]) => void;
}

export function PayrollApprovalChecklist({
  canApproveRole,
  isApproving = false,
  onApproveRequested,
  ...input
}: Props) {
  const result = useMemo(() => buildApprovalChecklist(input), [input]);
  const [acks, setAcks] = useState<Set<string>>(new Set());
  const [confirmed, setConfirmed] = useState(false);

  const blockers = result.items.filter((i) => i.status === "block");
  const warnings = result.items.filter((i) => i.status === "warning");
  const passed = result.items.filter((i) => i.status === "pass");

  const approvable =
    canApproveRole && confirmed && canApprove(result, acks) && !result.period_already_approved;

  const toggleAck = (id: string, on: boolean) => {
    setAcks((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {result.period_already_approved ? (
            <Lock className="h-4 w-4 text-muted-foreground" />
          ) : result.blocking_count > 0 ? (
            <ShieldX className="h-4 w-4 text-destructive" />
          ) : result.warning_count > 0 ? (
            <AlertTriangle className="h-4 w-4 text-warning" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-success" />
          )}
          Payroll approval readiness
          <span className="ml-auto flex items-center gap-1.5">
            {result.blocking_count > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {result.blocking_count} blocking
              </Badge>
            )}
            {result.warning_count > 0 && (
              <Badge variant="outline" className="text-[10px]">
                {result.warning_count} warning{result.warning_count === 1 ? "" : "s"}
              </Badge>
            )}
            {passed.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {passed.length} ok
              </Badge>
            )}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {result.period_already_approved && (
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
            <p className="font-medium">This payroll period is approved and locked.</p>
            <p className="text-muted-foreground">
              To make changes, it must be reopened through the approved workflow.
            </p>
          </div>
        )}

        {blockers.length > 0 && (
          <Section title="Blocking issues" tone="block">
            {blockers.map((i) => (
              <Row key={i.id} item={i} />
            ))}
          </Section>
        )}

        {warnings.length > 0 && (
          <Section title="Warnings — require acknowledgement" tone="warning">
            {warnings.map((i) => (
              <Row
                key={i.id}
                item={i}
                acknowledged={acks.has(i.id)}
                onAck={(v) => toggleAck(i.id, v)}
              />
            ))}
          </Section>
        )}

        {passed.length > 0 && (
          <details className="rounded-md border border-border bg-background/40 p-2 text-xs">
            <summary className="cursor-pointer font-medium text-muted-foreground">
              {passed.length} checks passed
            </summary>
            <ul className="mt-2 space-y-1 pl-4 list-disc text-muted-foreground">
              {passed.map((p) => (
                <li key={p.id}>{p.title}</li>
              ))}
            </ul>
          </details>
        )}

        {canApproveRole && !result.period_already_approved && (
          <div className="rounded-md border border-border bg-background p-3 space-y-3">
            <label className="flex items-start gap-2 text-xs">
              <Checkbox
                checked={confirmed}
                onCheckedChange={(v) => setConfirmed(v === true)}
              />
              <span className="text-muted-foreground">{APPROVAL_CONFIRMATION_TEXT}</span>
            </label>
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={!approvable || isApproving}
                onClick={() => onApproveRequested([...acks])}
              >
                {isApproving ? "Approving…" : "Approve & lock period"}
              </Button>
            </div>
          </div>
        )}

        {!canApproveRole && (
          <p className="text-xs text-muted-foreground">
            You do not have permission to approve this payroll period.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Section({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "block" | "warning";
  children: React.ReactNode;
}) {
  const cls =
    tone === "block"
      ? "border-destructive/30 bg-destructive/5"
      : "border-warning/30 bg-warning/5";
  return (
    <div className={`rounded-md border ${cls} p-2 space-y-2`}>
      <p className="text-xs font-medium px-1">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({
  item,
  acknowledged,
  onAck,
}: {
  item: ChecklistItem;
  acknowledged?: boolean;
  onAck?: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-2 rounded-sm bg-background/60 px-2 py-1.5">
      <span className="mt-0.5 text-xs">
        {item.status === "block" ? "✗" : item.status === "warning" ? "⚠" : "✓"}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium">
          {item.title}
          {item.count > 0 && (
            <span className="ml-2 text-muted-foreground">({item.count})</span>
          )}
        </p>
        <p className="text-[11px] text-muted-foreground">{item.detail}</p>
      </div>
      {item.requires_ack && onAck && (
        <label className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
          <Checkbox checked={!!acknowledged} onCheckedChange={(v) => onAck(v === true)} />
          Acknowledged
        </label>
      )}
    </div>
  );
}
