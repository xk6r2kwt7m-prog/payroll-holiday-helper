import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Info, ShieldAlert } from "lucide-react";
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
import { formatCurrency } from "@/lib/utils";
import type { NmwResult, NmwSummary, NmwStatus } from "@/lib/payroll-nmw";

interface Props {
  results: NmwResult[];
  summary: NmwSummary;
  canCheck: boolean;
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
    label: "At risk",
    cls: "bg-warning/10 text-warning border-warning/20",
    icon: AlertTriangle,
  },
  non_compliant: {
    label: "Non-compliant",
    cls: "bg-destructive/10 text-destructive border-destructive/20",
    icon: ShieldAlert,
  },
  insufficient_data: {
    label: "No data",
    cls: "bg-muted text-muted-foreground border-border",
    icon: Info,
  },
};

export function MinimumWageCompliancePanel({ results, summary, canCheck }: Props) {
  const [open, setOpen] = useState(summary.hasBlockers);

  if (!canCheck) return null;

  const headlineCls = summary.hasBlockers
    ? "border-destructive/40 bg-destructive/5"
    : summary.at_risk > 0
      ? "border-warning/40 bg-warning/5"
      : "border-success/30 bg-success/5";

  return (
    <Card className={`p-4 border ${headlineCls}`}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-foreground" />
            <div>
              <h3 className="text-sm font-semibold">UK Minimum Wage check</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Effective hourly rate = (basic pay + performance + special bonus) ÷ actual worked hours.
                Tips / service charge excluded.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatPill label="Compliant" value={summary.compliant} kind="compliant" />
            <StatPill label="At risk" value={summary.at_risk} kind="at_risk" />
            <StatPill label="Non-compliant" value={summary.non_compliant} kind="non_compliant" />
            {summary.insufficient_data > 0 && (
              <StatPill label="No DOB / 0h" value={summary.insufficient_data} kind="insufficient_data" />
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

        {summary.hasBlockers && (
          <p className="text-xs font-medium text-destructive mt-3">
            {summary.non_compliant} {summary.non_compliant === 1 ? "employee is" : "employees are"} below
            legal minimum wage for this period. Period cannot be approved until corrected (e.g. top-up payment).
          </p>
        )}

        <CollapsibleContent className="mt-3">
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
                {results
                  .slice()
                  .sort((a, b) => statusRank(a.status) - statusRank(b.status))
                  .map((r) => {
                    const meta = STATUS_META[r.status];
                    const Icon = meta.icon;
                    return (
                      <tr key={`${r.employee_id}-${r.payroll_entry_id ?? ""}`} className="border-b border-border/50 last:border-0">
                        <td className="py-2 pr-3">{r.employee_name}</td>
                        <td className="py-2 pr-3 text-muted-foreground">
                          {r.age_at_period_start !== null ? `${r.age_at_period_start}` : "—"} ·{" "}
                          {r.age_band_label}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">{r.actual_hours.toFixed(2)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{formatCurrency(r.eligible_pay)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          {r.effective_rate !== null ? `£${r.effective_rate.toFixed(2)}` : "—"}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          {r.required_rate > 0 ? `£${r.required_rate.toFixed(2)}` : "—"}
                        </td>
                        <td className="py-2">
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
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
            <strong>Included in eligible pay:</strong> basic pay (hours × rate), performance bonus, special bonus.{" "}
            <strong>Excluded:</strong> service charge / tips, holiday pay, salary sacrifice, premium overtime element,
            uniform deductions and accommodation offset (not yet modelled).{" "}
            <strong>Hours:</strong> actual worked hours from approved timesheets / imported payroll only —
            scheduled hours never count.
          </p>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function StatPill({
  label,
  value,
  kind,
}: {
  label: string;
  value: number;
  kind: NmwStatus;
}) {
  const meta = STATUS_META[kind];
  return (
    <Badge variant="outline" className={`gap-1 ${meta.cls}`}>
      <span className="tabular-nums font-semibold">{value}</span>
      <span className="font-normal opacity-80">{label}</span>
    </Badge>
  );
}

function statusRank(s: NmwStatus): number {
  switch (s) {
    case "non_compliant":
      return 0;
    case "at_risk":
      return 1;
    case "insufficient_data":
      return 2;
    case "compliant":
      return 3;
  }
}
