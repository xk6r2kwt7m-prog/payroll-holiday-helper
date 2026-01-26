import { Download, Calendar, TrendingUp, DollarSign } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";

interface PayrollRecord {
  id: string;
  period: string;
  payDate: string;
  totalAmount: number;
  employees: number;
  status: "completed" | "processing" | "scheduled";
}

const payrollHistory: PayrollRecord[] = [
  { id: "1", period: "February 2024", payDate: "Feb 28, 2024", totalAmount: 352500, employees: 48, status: "scheduled" },
  { id: "2", period: "January 2024", payDate: "Jan 31, 2024", totalAmount: 348200, employees: 47, status: "completed" },
  { id: "3", period: "December 2023", payDate: "Dec 29, 2023", totalAmount: 365800, employees: 47, status: "completed" },
  { id: "4", period: "November 2023", payDate: "Nov 30, 2023", totalAmount: 342100, employees: 46, status: "completed" },
  { id: "5", period: "October 2023", payDate: "Oct 31, 2023", totalAmount: 338500, employees: 45, status: "completed" },
];

const statusStyles = {
  completed: "bg-success/10 text-success",
  processing: "bg-warning/10 text-warning",
  scheduled: "bg-primary/10 text-primary",
};

const statusLabels = {
  completed: "Completed",
  processing: "Processing",
  scheduled: "Scheduled",
};

const Payroll = () => {
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-slide-in-left">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payroll</h1>
            <p className="text-muted-foreground">
              Manage payroll runs and view payment history
            </p>
          </div>
          <Button className="gradient-primary">
            <Calendar className="mr-2 h-4 w-4" />
            Run Payroll
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="This Month"
            value="$352,500"
            subtitle="Due Feb 28"
            icon={<DollarSign className="h-5 w-5" />}
            variant="primary"
          />
          <StatCard
            title="YTD Payroll"
            value="$700,700"
            icon={<TrendingUp className="h-5 w-5" />}
            trend={{ value: 5.2, isPositive: true }}
          />
          <StatCard
            title="Avg. Salary"
            value="$87,500"
            icon={<DollarSign className="h-5 w-5" />}
          />
          <StatCard
            title="Total Bonuses"
            value="$45,000"
            subtitle="This quarter"
            icon={<TrendingUp className="h-5 w-5" />}
            variant="success"
          />
        </div>

        {/* Payroll History */}
        <div className="rounded-xl bg-card shadow-card overflow-hidden animate-fade-in">
          <div className="border-b border-border px-6 py-4">
            <h3 className="text-lg font-semibold text-card-foreground">Payroll History</h3>
            <p className="text-sm text-muted-foreground">View and download past payroll records</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Pay Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Employees
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payrollHistory.map((record) => (
                  <tr
                    key={record.id}
                    className="transition-colors hover:bg-muted/30"
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="font-medium text-card-foreground">{record.period}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                      {record.payDate}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                      {record.employees} employees
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-card-foreground">
                      ${record.totalAmount.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          statusStyles[record.status]
                        }`}
                      >
                        {statusLabels[record.status]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Payroll;
