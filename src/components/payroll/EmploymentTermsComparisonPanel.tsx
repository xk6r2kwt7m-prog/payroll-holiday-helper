import { useState } from "react";
import { SyncFromTermsDialog } from "@/components/payroll/SyncFromTermsDialog";
import { RefreshCw } from "lucide-react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  FileSignature,
  Info,
  CalendarClock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  labelSourceType,
  type TermsComparisonRow,
  type TermsComparisonSummary,
} from "@/hooks/useEmploymentTermsComparison";

interface Props {
  rows: TermsComparisonRow[];
  summary: TermsComparisonSummary;
  canCheck: boolean;
  periodStartDate?: string | null;
  /** Phase 2C — needed for sync action. Omit to disable sync. */
  payrollPeriodId?: string;
  periodStatus?: string;
}

/**
 * Phase 2B — Read-only comparison panel.
 *
 * Surfaces drift between what payroll currently uses and what
 * employee_contract_terms says should apply as of the payroll period start.
 *
 * Does NOT block approval. Does NOT change calculations. Does NOT mutate
 * payroll entries, periods, or employee profile fields. Purely advisory.
 */
export function EmploymentTermsComparisonPanel({
  rows,
  summary,
  canCheck,
  periodStartDate,
  payrollPeriodId,
  periodStatus,
}: Props) {
  // Phase A — only true drift (rate / department mismatches) drives the amber
  // headline. "No active terms" and "backfill only" are informational and
  // render neutral so they do not compete visually with real blockers.
  const hasDrift = summary.rate_mismatch > 0 || summary.department_mismatch > 0;
  const hasInfoOnly =
    !hasDrift && (summary.no_active_terms > 0 || summary.backfill_only > 0);
  const [open, setOpen] = useState(hasDrift);
  const [syncOpen, setSyncOpen] = useState(false);

  if (!canCheck) return null;

  const isLocked = periodStatus === "approved";
  const canSync = !!payrollPeriodId && !isLocked && summary.rate_mismatch > 0;

  const headlineCls = hasDrift
    ? "border-warning/40 bg-warning/5"
    : hasInfoOnly
      ? "border-border bg-muted/30"
      : "border-success/30 bg-success/5";

  return (
    <Card className={`p-4 border ${headlineCls}`}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <FileSignature className="h-4 w-4 text-foreground" />
            <div>
              <h3 className="text-sm font-semibold">Employment Terms check</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Read-only comparison of payroll values vs active contract terms as of{" "}
                <strong>{periodStartDate ?? "period start"}</strong>. Does not block approval.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Pill kind="ok" label="Match" value={summary.matches} />
            <Pill kind="warn" label="Rate mismatch" value={summary.rate_mismatch} />
            <Pill kind="warn" label="Dept mismatch" value={summary.department_mismatch} />
            <Pill kind="muted" label="No active terms" value={summary.no_active_terms} />
            <Pill kind="muted" label="Backfill only" value={summary.backfill_only} />
            {summary.scheduled_pending > 0 && (
              <Pill kind="muted" label="Scheduled change" value={summary.scheduled_pending} />
            )}
            {canSync && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                onClick={() => setSyncOpen(true)}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Sync draft payroll rates from terms
              </Button>
            )}
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2">
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
                />
                <span className="ml-1 text-xs">Detail</span>
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent className="mt-3">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left py-2 pr-3 font-medium">Employee</th>
                  <th className="text-right py-2 pr-3 font-medium">Payroll £/hr</th>
                  <th className="text-right py-2 pr-3 font-medium">Active terms £/hr</th>
                  <th className="text-left py-2 pr-3 font-medium">Source</th>
                  <th className="text-left py-2 pr-3 font-medium">Effective from</th>
                  <th className="text-left py-2 pr-3 font-medium">Status</th>
                  <th className="text-left py-2 font-medium">Warning</th>
                </tr>
              </thead>
              <tbody>
                {rows
                  .slice()
                  .sort((a, b) => rank(a) - rank(b))
                  .map((r) => (
                    <tr
                      key={r.payroll_entry_id}
                      className="border-b border-border/50 last:border-0 align-top"
                    >
                      <td className="py-2 pr-3">{r.employee_name}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        £{r.payroll_rate.toFixed(2)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {r.terms?.hourly_rate !== null && r.terms?.hourly_rate !== undefined
                          ? `£${Number(r.terms.hourly_rate).toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {labelSourceType(r.terms?.source_type)}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground tabular-nums">
                        {r.terms?.effective_from ?? "—"}
                      </td>
                      <td className="py-2 pr-3">
                        <StatusBadge row={r} />
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {r.warnings.length === 0 ? (
                          <span className="opacity-60">—</span>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center gap-1 cursor-help">
                                  {r.hasScheduledChange && (
                                    <CalendarClock className="h-3 w-3 text-muted-foreground" />
                                  )}
                                  {r.warnings[0]}
                                  {r.warnings.length > 1 && (
                                    <span className="opacity-60"> (+{r.warnings.length - 1})</span>
                                  )}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm text-xs space-y-1">
                                {r.warnings.map((w, i) => (
                                  <div key={i}>• {w}</div>
                                ))}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
            Comparison uses <code>getActiveEmploymentTerms(employee, period_start)</code>. This
            panel never alters payroll entries, periods, employee profiles, or signed contracts.
            Payroll calculations and approval logic are unchanged in this phase.
          </p>
        </CollapsibleContent>
      </Collapsible>

      {payrollPeriodId && periodStatus && (
        <SyncFromTermsDialog
          open={syncOpen}
          onOpenChange={setSyncOpen}
          payrollPeriodId={payrollPeriodId}
          periodStatus={periodStatus}
          rows={rows}
        />
      )}
    </Card>
  );
}

function Pill({
  label,
  value,
  kind,
}: {
  label: string;
  value: number;
  kind: "ok" | "warn" | "muted";
}) {
  const cls =
    kind === "ok"
      ? "bg-success/10 text-success border-success/20"
      : kind === "warn"
        ? "bg-warning/10 text-warning border-warning/20"
        : "bg-muted text-muted-foreground border-border";
  return (
    <Badge variant="outline" className={`gap-1 ${cls}`}>
      <span className="tabular-nums font-semibold">{value}</span>
      <span className="font-normal opacity-80">{label}</span>
    </Badge>
  );
}

function StatusBadge({ row }: { row: TermsComparisonRow }) {
  if (row.status === "no_active_terms") {
    return (
      <Badge variant="outline" className="gap-1 bg-warning/10 text-warning border-warning/20">
        <AlertTriangle className="h-3 w-3" />
        No active terms
      </Badge>
    );
  }
  if (row.status === "rate_mismatch" || row.status === "multiple_mismatch") {
    return (
      <Badge variant="outline" className="gap-1 bg-warning/10 text-warning border-warning/20">
        <AlertTriangle className="h-3 w-3" />
        Rate mismatch{row.rateDiff !== null ? ` (${row.rateDiff > 0 ? "+" : ""}£${row.rateDiff.toFixed(2)})` : ""}
      </Badge>
    );
  }
  if (row.status === "department_mismatch") {
    return (
      <Badge variant="outline" className="gap-1 bg-warning/10 text-warning border-warning/20">
        <AlertTriangle className="h-3 w-3" />
        Dept mismatch
      </Badge>
    );
  }
  if (row.status === "backfill_only") {
    return (
      <Badge variant="outline" className="gap-1 bg-muted text-muted-foreground border-border">
        <Info className="h-3 w-3" />
        Backfill only
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 bg-success/10 text-success border-success/20">
      <CheckCircle2 className="h-3 w-3" />
      Match
    </Badge>
  );
}

function rank(r: TermsComparisonRow): number {
  switch (r.status) {
    case "no_active_terms":
      return 0;
    case "multiple_mismatch":
      return 1;
    case "rate_mismatch":
      return 2;
    case "department_mismatch":
      return 3;
    case "backfill_only":
      return 4;
    case "match":
      return 5;
  }
}
