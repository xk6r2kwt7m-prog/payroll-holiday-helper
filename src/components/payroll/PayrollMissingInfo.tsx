import { useState } from "react";
import { AlertTriangle, ExternalLink, ChevronDown, ChevronUp, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  isStarterInPeriod,
  isRelevantToPayrollPeriod,
  type RelevancePeriod,
} from "@/lib/employee-period-relevance";

interface MissingField {
  label: string;
  tab: string;
}

interface EmployeeMissingInfo {
  id: string;
  name: string;
  missing: MissingField[];
  isStarterHere: boolean;
}

interface PayrollMissingInfoProps {
  entries: any[];
  periodName?: string;
  period?: RelevancePeriod | null;
  priorPeriodEmployeeIds?: Set<string>;
  holidayPaymentEmployeeIds?: Set<string>;
}

const FIELD_CATEGORIES = [
  { key: "bank", label: "Bank details", fields: ["Bank account number", "Sort code"] },
  { key: "ni", label: "NI", fields: ["National Insurance number"] },
  { key: "dob", label: "DOB", fields: ["Date of birth"] },
  { key: "rtw", label: "RTW", fields: ["Right to work details"] },
];

export function PayrollMissingInfo({
  entries,
  periodName,
  period,
  priorPeriodEmployeeIds,
  holidayPaymentEmployeeIds,
}: PayrollMissingInfoProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const employeesWithMissing: EmployeeMissingInfo[] = [];
  const entryEmployeeIds = new Set(entries.map((e) => e.employees?.id).filter(Boolean));

  for (const entry of entries) {
    const emp = entry.employees;
    if (!emp) continue;

    // Exclude former employees who aren't relevant to this period.
    if (period) {
      const relevant = isRelevantToPayrollPeriod(emp, period, {
        entryEmployeeIds,
        holidayPaymentEmployeeIds,
      });
      if (!relevant) continue;
    }

    const starterHere = period
      ? isStarterInPeriod(emp, period, priorPeriodEmployeeIds)
      : emp.status === "starter";

    const missing: MissingField[] = [];

    if (!emp.bank_account_no) missing.push({ label: "Bank account number", tab: "banking" });
    if (!emp.sort_code) missing.push({ label: "Sort code", tab: "banking" });
    if (!emp.ni_number) missing.push({ label: "National Insurance number", tab: "personal" });
    if (!(emp as any).date_of_birth) missing.push({ label: "Date of birth", tab: "personal" });

    // RTW warning is only meaningful for a true current-period starter.
    if (
      starterHere &&
      !(emp as any).passport_no &&
      !(emp as any).sharing_code &&
      !(emp as any).settlement_status &&
      !(emp as any).residence_permit
    ) {
      missing.push({ label: "Right to work details", tab: "rtw" });
    }

    if (missing.length > 0) {
      employeesWithMissing.push({
        id: emp.id,
        name: `${emp.forename} ${emp.surname}`,
        missing,
        isStarterHere: starterHere,
      });
    }
  }

  if (employeesWithMissing.length === 0) return null;

  const totalMissing = employeesWithMissing.reduce((s, e) => s + e.missing.length, 0);

  // Filter employees by category
  const filteredEmployees = activeFilter
    ? employeesWithMissing.filter(emp => {
        const cat = FIELD_CATEGORIES.find(c => c.key === activeFilter);
        return cat && emp.missing.some(m => cat.fields.includes(m.label));
      })
    : employeesWithMissing;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 space-y-2 animate-fade-in">
        <CollapsibleTrigger asChild>
          <button className="flex items-center justify-between gap-2 w-full text-left group">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
              <h3 className="font-semibold text-card-foreground text-sm">
                Missing Employee Information
              </h3>
              <Badge variant="secondary" className="bg-warning/20 text-warning text-[10px]">
                {employeesWithMissing.length} {employeesWithMissing.length === 1 ? "employee" : "employees"} · {totalMissing} {totalMissing === 1 ? "field" : "fields"}
              </Badge>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                {isOpen ? "Hide details" : "View details"}
              </span>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        {!isOpen && periodName && (
          <p className="text-xs text-muted-foreground pl-7">
            Fix before approval.
          </p>
        )}

        <CollapsibleContent className="space-y-3">
          {periodName && (
            <p className="text-xs text-muted-foreground pl-7">
              {periodName} payroll has {employeesWithMissing.length} {employeesWithMissing.length === 1 ? "employee" : "employees"} with missing information. Fix before approval.
            </p>
          )}

          {/* Filter chips */}
          <div className="flex items-center gap-1.5 pl-7 flex-wrap">
            <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <button
              onClick={() => setActiveFilter(null)}
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
                !activeFilter
                  ? "bg-warning/20 text-warning"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              All ({employeesWithMissing.length})
            </button>
            {FIELD_CATEGORIES.map(cat => {
              const count = employeesWithMissing.filter(emp =>
                emp.missing.some(m => cat.fields.includes(m.label))
              ).length;
              if (count === 0) return null;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveFilter(activeFilter === cat.key ? null : cat.key)}
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
                    activeFilter === cat.key
                      ? "bg-warning/20 text-warning"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>

          <div className="grid gap-2">
            {filteredEmployees.map((emp) => (
              <div
                key={emp.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-card-foreground">{emp.name}</p>
                  {emp.isStarterHere && (
                    <Badge variant="outline" className="mt-1 text-[10px] h-5">Starter · First payroll</Badge>
                  )}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {emp.missing.map((m) => (
                      <button
                        key={m.label}
                        onClick={() => navigate(`/employees?edit=${emp.id}&tab=${m.tab}`)}
                        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
                      >
                        {m.label}
                        <ExternalLink className="h-2.5 w-2.5" />
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 h-7 px-2 text-xs"
                  onClick={() => navigate(`/employees?edit=${emp.id}&tab=${emp.missing[0]?.tab || "personal"}`)}
                >
                  Fix now
                </Button>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

