import { DollarSign, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface PayrollItem {
  label: string;
  amount: number;
  percentage: number;
}

const payrollBreakdown: PayrollItem[] = [
  { label: "Base Salaries", amount: 245000, percentage: 70 },
  { label: "Bonuses", amount: 35000, percentage: 10 },
  { label: "Benefits", amount: 52500, percentage: 15 },
  { label: "Taxes", amount: 17500, percentage: 5 },
];

export function UpcomingPayroll() {
  const totalPayroll = payrollBreakdown.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="rounded-xl bg-card shadow-card overflow-hidden animate-fade-in">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-card-foreground">Upcoming Payroll</h3>
            <p className="text-sm text-muted-foreground">Next payment: February 28, 2024</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
            <DollarSign className="h-5 w-5 text-success" />
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-card-foreground">
              ${totalPayroll.toLocaleString()}
            </span>
            <div className="flex items-center gap-1 text-sm text-success">
              <TrendingUp className="h-4 w-4" />
              <span>+2.5%</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Total payroll for this period</p>
        </div>
        <div className="space-y-4">
          {payrollBreakdown.map((item) => (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium text-card-foreground">
                  ${item.amount.toLocaleString()}
                </span>
              </div>
              <Progress value={item.percentage} className="h-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
