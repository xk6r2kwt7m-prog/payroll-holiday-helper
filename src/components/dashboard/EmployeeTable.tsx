import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { employees, formatCurrency, type PayrollEntry } from "@/data/payrollData";

const statusStyles = {
  active: "bg-success/10 text-success border-success/20",
  leaver: "bg-destructive/10 text-destructive border-destructive/20",
  starter: "bg-primary/10 text-primary border-primary/20",
};

const statusLabels = {
  active: "Active",
  leaver: "Leaver",
  starter: "Starter",
};

const departmentStyles = {
  FOH: "bg-accent/10 text-accent",
  BOH: "bg-primary/10 text-primary",
  CPU: "bg-warning/10 text-warning",
};

export function EmployeeTable() {
  // Show top 8 employees by pay
  const topEmployees = [...employees]
    .sort((a, b) => b.totalPay - a.totalPay)
    .slice(0, 8);

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
            {topEmployees.map((employee) => (
              <tr
                key={employee.employeeId}
                className="transition-colors hover:bg-muted/30"
              >
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                        {employee.forename[0]}{employee.surname[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-card-foreground">{employee.forename} {employee.surname}</p>
                      <p className="text-sm text-muted-foreground">{formatCurrency(employee.hourlyRate)}/hr</p>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${departmentStyles[employee.department]}`}>
                    {employee.department}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                  {employee.timesheetHours.toFixed(2)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-card-foreground">
                  {formatCurrency(employee.totalPay)}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <Badge
                    variant="outline"
                    className={statusStyles[employee.status]}
                  >
                    {statusLabels[employee.status]}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
