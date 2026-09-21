import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Info, ShieldAlert, Users } from "lucide-react";
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
import { formatCurrency } from "@/hooks/useHolidays";
import type { NmwResult, NmwSummary, NmwStatus } from "@/lib/payroll-nmw";
import type { NmwExcludedRow } from "@/hooks/usePayrollMinimumWageCheck";
import {
  NmwAdjustmentDialog,
  type NmwAdjustableEntry,
} from "@/components/payroll/NmwAdjustmentDialog";

interface Props {
  results: NmwResult[];
  summary: NmwSummary;
  canCheck: boolean;
  /** Pay lines left out of the check (former employees / future starters). */
  excluded?: NmwExcludedRow[];
  /** Payroll entries for this period, keyed by entry id — enables the Adjust action. */
  entriesById?: Record<string, NmwAdjustableEntry>;
  periodId?: string;
  periodStatus?: string | null;
  /** Employee ids that already carry a recorded minimum wage correction. */
  correctedEmployeeIds?: Set<string>;
}

const STATUS_META: Record<
  NmwStatus,
  { label: string; cls: string; icon: typeof CheckCircle2 }
> = {
  compliant: {
    label: "Compliant",
    cls: "bg-success/10 text-success border-success/20",
    icon: CheckCircle2,
  },
  at_risk: {
    label: "Close to minimum",
    cls: "bg-warning/10 text-warning border-warning/20",
    icon: AlertTriangle,
  },
  non_compliant: {
    label: "Below legal minimum",
    cls: "bg-destructive/10 text-destructive border-destructive/20",
    icon: ShieldAlert,
  },
  insufficient_data: {
    label: "Information missing",
    cls: "bg-muted text-muted-foreground border-border",
    icon: Info,
  },
};

export function MinimumWageCompliancePanel({
  results,
  summary,
  canCheck,
  excluded = [],
  entriesById,
  periodId,
  periodStatus,
  correctedEmployeeIds,
}: Props) {
  const [adjusting, setAdjusting] = useState<NmwResult | null>(null);

  if (!canCheck) return null;

  const blocking = results.filter((r) => r.status === "non_compliant");
  const closeToMin = results.filter((r) => r.status === "at_risk");
  const passed = results.filter((r) => r.status === "compliant");
  const missing = results.filter((r) => r.status === "insufficient_data");
  const mismatches = results.filter((r) => r.contract_rate_mismatch);

  const headlineCls = blocking.length > 0
    ? "border-destructive/40 bg-destructive/5"
    : "border-success/30 bg-success/5";

  return (
    <Card className={`p-4 border ${headlineCls}`}>
      <div className="flex items-start gap-2">
        <ShieldAlert className="h-4 w-4 text-foreground mt-0.5 shrink-0" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">UK Minimum Wage check</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Effective hourly rate = (basic pay + performance + special bonus) ÷ actual worked hours.
            Tips and service charge never count. Figures are compared at full precision and only
            rounded for display.
          </p>
        </div>
      </div>

      {/* Blocking issues only — always visible */}
      {blocking.length > 0 ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-destructive">
            {blocking.length} {blocking.length === 1 ? "employee is" : "employees are"} below legal
            minimum wage for this period. Correct before approval.
          </p>
          <ResultTable
            rows={blocking}
            correctedEmployeeIds={correctedEmployeeIds}
            periodId={periodId}
            entriesById={entriesById}
            onAdjust={setAdjusting}
          />
        </div>
      ) : (
        <p className="mt-3 text-xs font-medium text-success flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" />
          No minimum-wage breaches in this period.
        </p>
      )}

      <div className="mt-3 space-y-1.5">
        {passed.length > 0 && (
          <Group
            testId="nmw-group-passed"
            title={`Minimum-wage check passed — ${passed.length} ${passed.length === 1 ? "employee" : "employees"}`}
            tone="success"
            icon={CheckCircle2}
          >
            <ResultTable rows={passed} correctedEmployeeIds={correctedEmployeeIds} />
          </Group>
        )}

        {closeToMin.length > 0 && (
          <Group
            testId="nmw-group-close"
            title={`Close to the legal minimum — ${closeToMin.length} ${closeToMin.length === 1 ? "employee" : "employees"}`}
            subtitle="Compliant. Shown for awareness only — does not block payroll."
            tone="warning"
            icon={AlertTriangle}
          >
            <ResultTable rows={closeToMin} correctedEmployeeIds={correctedEmployeeIds} />
          </Group>
        )}

        {missing.length > 0 && (
          <Group
            testId="nmw-group-missing"
            title={`Information missing — unable to verify — ${missing.length} ${missing.length === 1 ? "employee" : "employees"}`}
            subtitle="Not treated as non-compliant. Add the missing details to complete the check."
            tone="neutral"
            icon={Info}
          >
            <ResultTable rows={missing} correctedEmployeeIds={correctedEmployeeIds} />
          </Group>
        )}

        {mismatches.length > 0 && (
          <Group
            testId="nmw-group-mismatch"
            title={`Payroll rate differs from contracted rate — ${mismatches.length}`}
            subtitle="Separate from a minimum-wage breach. Informational; does not block payroll."
            tone="warning"
            icon={AlertTriangle}
          >
            <ul className="text-xs divide-y divide-border/50">
              {mismatches.map((r) => {
                const payrollRate =
                  r.actual_hours > 0 ? r.calculation_basis.basic_pay / r.actual_hours : null;
                return (
                  <li key={`mm-${r.employee_id}`} className="py-1.5 flex justify-between gap-3">
                    <span>{r.employee_name}</span>
                    <span className="tabular-nums text-muted-foreground">
                      payroll £{payrollRate !== null ? payrollRate.toFixed(2) : "—"} · contract £
                      {r.contracted_rate !== null ? r.contracted_rate.toFixed(2) : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Group>
        )}

        {excluded.length > 0 && (
          <Group
            testId="nmw-group-excluded"
            title={`Former employees — no payment due this period — ${excluded.length}`}
            subtitle="Left out of the checks and counts. Their records and history are unchanged."
            tone="neutral"
            icon={Users}
          >
            <ul className="text-xs divide-y divide-border/50">
              {excluded.map((x) => (
                <li key={`ex-${x.employee_id}`} className="py-1.5 flex justify-between gap-3">
                  <span>{x.employee_name}</span>
                  <span className="text-muted-foreground">{x.reason}</span>
                </li>
              ))}
            </ul>
          </Group>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
        <strong>Included in eligible pay:</strong> basic pay (hours × rate), performance bonus,
        special bonus. <strong>Excluded:</strong> service charge / tips, holiday pay, salary
        sacrifice, premium overtime element, uniform deductions and accommodation offset.{" "}
        <strong>Hours:</strong> actual worked hours from approved timesheets / imported payroll only.
      </p>

      {periodId && (
        <NmwAdjustmentDialog
          open={!!adjusting}
          onOpenChange={(v) => !v && setAdjusting(null)}
          result={adjusting}
          entry={
            adjusting?.payroll_entry_id
              ? entriesById?.[adjusting.payroll_entry_id] ?? null
              : null
          }
          periodId={periodId}
          periodStatus={periodStatus}
        />
      )}
    </Card>
  );
}

function Group({
  title,
  subtitle,
  tone,
  icon: Icon,
  testId,
  children,
}: {
  title: string;
  subtitle?: string;
  tone: "success" | "warning" | "neutral";
  icon: typeof CheckCircle2;
  testId: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const toneCls =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : "text-muted-foreground";
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border border-border/60 bg-background/60">
        <CollapsibleTrigger asChild>
          <button
            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
            data-testid={testId}
          >
            <span className="flex items-center gap-2 min-w-0">
              <Icon className={`h-3.5 w-3.5 shrink-0 ${toneCls}`} />
              <span className="text-xs font-medium truncate">{title}</span>
            </span>
            <span className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground">
              {open ? "Hide details" : "View details"}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
            </span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-3 pb-3">
          {subtitle && <p className="text-[11px] text-muted-foreground mb-2">{subtitle}</p>}
          {children}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function ResultTable({
  rows,
  correctedEmployeeIds,
  periodId,
  entriesById,
  onAdjust,
}: {
  rows: NmwResult[];
  correctedEmployeeIds?: Set<string>;
  periodId?: string;
  entriesById?: Record<string, NmwAdjustableEntry>;
  onAdjust?: (r: NmwResult) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="text-muted-foreground border-b border-border">
          <tr>
            <th className="text-left py-2 pr-3 font-medium">Employee</th>
            <th className="text-left py-2 pr-3 font-medium">Age / band</th>
            <th className="text-right py-2 pr-3 font-medium">Hours</th>
            <th className="text-right py-2 pr-3 font-medium">Eligible pay</th>
            <th className="text-right py-2 pr-3 font-medium">Effective £/hr</th>
            <th className="text-right py-2 pr-3 font-medium">Required £/hr</th>
            <th className="text-left py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const meta = STATUS_META[r.status];
            const Icon = meta.icon;
            return (
              <tr
                key={`${r.employee_id}-${r.payroll_entry_id ?? ""}`}
                className="border-b border-border/50 last:border-0"
              >
                <td className="py-2 pr-3">
                  {r.employee_name}
                  {r.relies_on_service_charge && (
                    <Badge
                      variant="outline"
                      className="ml-2 text-[10px] bg-destructive/10 text-destructive border-destructive/30"
                    >
                      Relies on SC
                    </Badge>
                  )}
                </td>
                <td className="py-2 pr-3 text-muted-foreground">
                  {r.age_at_period_start !== null ? `${r.age_at_period_start}` : "—"} ·{" "}
                  {r.age_band_label}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">{r.actual_hours.toFixed(2)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">
                  {formatCurrency(r.eligible_pay)}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">
                  {r.effective_rate !== null ? `£${r.effective_rate.toFixed(2)}` : "—"}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">
                  {r.required_rate > 0 ? `£${r.required_rate.toFixed(2)}` : "—"}
                </td>
                <td className="py-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className={`gap-1 ${meta.cls}`}>
                            <Icon className="h-3 w-3" />
                            {meta.label}
                            {r.status === "non_compliant" && r.shortfall > 0 && (
                              <span className="ml-1">· short {formatCurrency(r.shortfall)}</span>
                            )}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs">
                          {r.message}
                          {r.relies_on_service_charge && (
                            <div className="mt-1 text-destructive">
                              Service charge cannot be used to make up National Minimum Wage.
                            </div>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {correctedEmployeeIds?.has(r.employee_id) && (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-success/10 text-success border-success/20"
                      >
                        Corrected
                      </Badge>
                    )}
                    {r.status === "non_compliant" &&
                      periodId &&
                      r.payroll_entry_id &&
                      entriesById?.[r.payroll_entry_id] &&
                      onAdjust && (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-[11px] font-medium"
                          onClick={() => onAdjust(r)}
                          data-testid={`nmw-adjust-${r.employee_id}`}
                        >
                          Click here to adjust
                        </Button>
                      )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
