import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  salary: number;
  status: "active" | "on-leave" | "pending";
}

const employees: Employee[] = [
  { id: "1", name: "Sarah Johnson", role: "Senior Developer", department: "Engineering", salary: 95000, status: "active" },
  { id: "2", name: "Michael Chen", role: "Product Manager", department: "Product", salary: 105000, status: "active" },
  { id: "3", name: "Emily Davis", role: "UX Designer", department: "Design", salary: 85000, status: "on-leave" },
  { id: "4", name: "James Wilson", role: "Data Analyst", department: "Analytics", salary: 78000, status: "active" },
  { id: "5", name: "Lisa Anderson", role: "HR Manager", department: "Human Resources", salary: 88000, status: "pending" },
];

const statusStyles = {
  active: "bg-success/10 text-success border-success/20",
  "on-leave": "bg-warning/10 text-warning border-warning/20",
  pending: "bg-muted text-muted-foreground border-border",
};

const statusLabels = {
  active: "Active",
  "on-leave": "On Leave",
  pending: "Pending",
};

export function EmployeeTable() {
  return (
    <div className="rounded-xl bg-card shadow-card overflow-hidden animate-fade-in">
      <div className="border-b border-border px-6 py-4">
        <h3 className="text-lg font-semibold text-card-foreground">Recent Employees</h3>
        <p className="text-sm text-muted-foreground">Overview of your team members</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Employee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Salary
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {employees.map((employee) => (
              <tr
                key={employee.id}
                className="transition-colors hover:bg-muted/30"
              >
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                        {employee.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-card-foreground">{employee.name}</p>
                      <p className="text-sm text-muted-foreground">{employee.role}</p>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                  {employee.department}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-card-foreground">
                  ${employee.salary.toLocaleString()}
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
