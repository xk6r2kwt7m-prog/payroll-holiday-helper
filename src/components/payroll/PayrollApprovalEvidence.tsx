/**
 * Phase 5C — Payroll approval evidence snapshot (read-only).
 *
 * Surfaces, in a single glance, the readiness state the manager is
 * about to approve from. This is purely a display layer derived from
 * existing in-memory state — it does NOT persist anywhere, does not
 * write to the audit log, and does not change any approval condition.
 *
 * Hard rules (preserved):
 *   - No mutation of payroll, contract, or audit data.
 *   - No new database tables/columns.
 *   - No new audit action.
 *   - Service charge remains excluded from NMW eligible pay (this
 *     component never recomputes NMW; it only reflects checklist state).
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, ShieldX, Lock, ClipboardCheck } from "lucide-react";
import type { ApprovalChecklistResult } from "@/lib/payroll-approval-checklist";

interface Props {
  period: {
    period_name: string;
    status: string;
    start_date?: string | null;
    end_date?: string | null;
  };
  entryCount: number;
  checklist: ApprovalChecklistResult | null;
  acknowledgedIds: Set<string>;
  confirmed: boolean;
  approvalBlock: string | null;
}

export function PayrollApprovalEvidence({
  period,
  entryCount,
  checklist,
  acknowledgedIds,
  confirmed,
  approvalBlock,
}: Props) {
  const blocking = checklist?.blocking_count ?? 0;
  const warnings = checklist?.warning_count ?? 0;
  const ackRequired = checklist?.ack_required_ids ?? [];
  const ackDone = ackRequired.filter((id) => acknowledgedIds.has(id)).length;
  const alreadyApproved = !!checklist?.period_already_approved;

  const Icon = alreadyApproved
    ? Lock
    : blocking > 0
      ? ShieldX
      : approvalBlock
        ? AlertTriangle
        : CheckCircle2;

  const iconCls = alreadyApproved
    ? "text-muted-foreground"
    : blocking > 0
      ? "text-destructive"
      : approvalBlock
        ? "text-warning"
        : "text-success";

  const dateRange =
    period.start_date && period.end_date
      ? `${formatDate(period.start_date)} – ${formatDate(period.end_date)}`
      : null;

  return (
    <Card data-testid="approval-evidence">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          Approval evidence
          <Badge variant="outline" className="ml-auto text-[10px] capitalize">
            {period.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <Field label="Period">
            <span className="font-medium text-foreground">{period.period_name}</span>
            {dateRange && (
              <span className="block text-[11px] text-muted-foreground">{dateRange}</span>
            )}
          </Field>
          <Field label="Entries included">
            <span className="font-medium text-foreground" data-testid="evidence-entry-count">
              {entryCount}
            </span>
          </Field>
          <Field label="Checklist warnings">
            <span className="font-medium text-foreground" data-testid="evidence-warning-count">
              {warnings}
            </span>
            {warnings > 0 && (
              <span className="ml-2 text-muted-foreground" data-testid="evidence-ack-progress">
                {ackDone}/{ackRequired.length} acknowledged
              </span>
            )}
          </Field>
          <Field label="Approval confirmation">
            <span
              className={`font-medium ${confirmed ? "text-success" : "text-muted-foreground"}`}
              data-testid="evidence-confirmed"
            >
              {confirmed ? "Ticked" : "Not ticked"}
            </span>
          </Field>
        </div>

        <div
          className={`rounded-md border p-2.5 flex items-start gap-2 ${
            approvalBlock || blocking > 0
              ? "border-warning/30 bg-warning/5"
              : "border-success/30 bg-success/5"
          }`}
          data-testid="evidence-status"
        >
          <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${iconCls}`} />
          <div className="flex-1 min-w-0">
            {alreadyApproved ? (
              <p className="text-xs">
                <span className="font-medium">Period locked.</span>{" "}
                <span className="text-muted-foreground">
                  Approval evidence is read-only.
                </span>
              </p>
            ) : approvalBlock ? (
              <p className="text-xs">
                <span className="font-medium">Approval blocked.</span>{" "}
                <span className="text-muted-foreground" data-testid="evidence-blocked-reason">
                  {approvalBlock}
                </span>
              </p>
            ) : (
              <p className="text-xs">
                <span className="font-medium">Ready for approval.</span>{" "}
                <span className="text-muted-foreground">
                  All checklist items resolved or acknowledged.
                </span>
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-background/40 px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-xs">{children}</div>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
