import { AlertTriangle, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface MissingField {
  label: string;
  tab: string;
}

interface EmployeeMissingInfo {
  id: string;
  name: string;
  missing: MissingField[];
}

interface PayrollMissingInfoProps {
  entries: any[];
  periodName?: string;
}

export function PayrollMissingInfo({ entries, periodName }: PayrollMissingInfoProps) {
  const navigate = useNavigate();

  const employeesWithMissing: EmployeeMissingInfo[] = [];

  for (const entry of entries) {
    const emp = entry.employees;
    if (!emp) continue;

    const missing: MissingField[] = [];

    if (!emp.bank_account_no) missing.push({ label: "Bank account number", tab: "banking" });
    if (!emp.sort_code) missing.push({ label: "Sort code", tab: "banking" });
    if (!emp.ni_number) missing.push({ label: "National Insurance number", tab: "personal" });

    // Date of birth needed for age-based pay compliance
    if (!(emp as any).date_of_birth) missing.push({ label: "Date of birth", tab: "personal" });

    if (missing.length > 0) {
      employeesWithMissing.push({
        id: emp.id,
        name: `${emp.forename} ${emp.surname}`,
        missing,
      });
    }
  }

  if (employeesWithMissing.length === 0) return null;

  const totalMissing = employeesWithMissing.reduce((s, e) => s + e.missing.length, 0);

  return (
    <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 space-y-3 animate-fade-in">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
        <h3 className="font-semibold text-card-foreground text-sm">
          Missing Employee Information
        </h3>
        <Badge variant="secondary" className="bg-warning/20 text-warning text-[10px]">
          {employeesWithMissing.length} {employeesWithMissing.length === 1 ? "employee" : "employees"} · {totalMissing} {totalMissing === 1 ? "field" : "fields"}
        </Badge>
      </div>

      {periodName && (
        <p className="text-xs text-muted-foreground">
          {periodName} payroll has {employeesWithMissing.length} {employeesWithMissing.length === 1 ? "employee" : "employees"} with missing information. Fix before approval.
        </p>
      )}

      <div className="grid gap-2">
        {employeesWithMissing.map((emp) => (
          <div
            key={emp.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background p-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-card-foreground">{emp.name}</p>
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
    </div>
  );
}
