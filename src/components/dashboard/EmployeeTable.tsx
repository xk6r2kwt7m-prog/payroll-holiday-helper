import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { usePayrollPeriods, usePayrollEntries } from "@/hooks/usePayroll";
import { useMemo } from "react";

const statusStyles: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  leaver: "bg-destructive/10 text-destructive border-destructive/20",
  starter: "bg-primary/10 text-primary border-primary/20",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  leaver: "Leaver",
  starter: "Starter",
};

const departmentStyles: Record<string, string> = {
  FOH: "bg-accent/10 text-accent",
  BOH: "bg-primary/10 text-primary",
  CPU: "bg-warning/10 text-warning",
};

export function EmployeeTable() {
  const { data: periods = [] } = usePayrollPeriods();
  const latestPeriodId = periods[0]?.id;
  const { data: entries = [], isLoading } = usePayrollEntries(latestPeriodId);

  const formatCurrency = (v: number) => `£${v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Read stored values only — show top 8 by stored total_pay
  const topEmployees = useMemo(() => {
    return [...(entries as any[])]
      .sort((a, b) => (b.total_pay || 0) - (a.total_pay || 0))
      .slice(0, 8);
  }, [entries]);

  if (isLoading) {
    return (
      <div className="rounded-xl bg-card shadow-card overflow-hidden animate-fade-in p-6">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (topEmployees.length === 0) {
    return (
      <div className="rounded-xl bg-card shadow-card overflow-hidden animate-fade-in p-6">
        <h3 className="text-lg font-semibold text-card-foreground">Top Earners This Period</h3>
        <p className="text-sm text-muted-foreground mt-1">No payroll entries yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card shadow-card overflow-hidden animate-fade-in">
      <div className="border-b border-border px-6 py-4">
        <h3 className="text-lg font-semibold text-card-foreground">Top Earners This Period</h3>
        <p className="text-sm text-muted-foreground">Employees sorted by total pay</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Employee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Dept
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Hours
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Pay
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {topEmployees.map((entry: any) => {
              const emp = entry.employees;
              const dept = emp?.department || "—";
              const status = emp?.status || "active";
              return (
                <tr
                  key={entry.id}
                  className="transition-colors hover:bg-muted/30"
                >
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                          {(emp?.forename || "?")[0]}{(emp?.surname || "?")[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-card-foreground">{emp?.forename} {emp?.surname}</p>
                        <p className="text-sm text-muted-foreground">{formatCurrency(entry.hourly_rate || 0)}/hr</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${departmentStyles[dept] || "bg-muted text-muted-foreground"}`}>
                      {dept}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                    {(entry.timesheet_hours || 0).toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-card-foreground">
                    {formatCurrency(entry.total_pay || 0)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Badge
                      variant="outline"
                      className={statusStyles[status] || ""}
                    >
                      {statusLabels[status] || status}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
