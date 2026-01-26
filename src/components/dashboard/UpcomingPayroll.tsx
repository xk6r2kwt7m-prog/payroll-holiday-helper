import { DollarSign, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { payrollSummary, formatCurrency } from "@/data/payrollData";

interface PayrollItem {
  label: string;
  amount: number;
  percentage: number;
  color: string;
}

const payrollBreakdown: PayrollItem[] = [
  { 
    label: "Timesheet", 
    amount: payrollSummary.timesheet, 
    percentage: (payrollSummary.timesheet / payrollSummary.totalPayroll) * 100,
    color: "bg-primary"
  },
  { 
    label: "Holidays", 
    amount: payrollSummary.holidays, 
    percentage: (payrollSummary.holidays / payrollSummary.totalPayroll) * 100,
    color: "bg-accent"
  },
  { 
    label: "Incentives", 
    amount: payrollSummary.incentives, 
    percentage: (payrollSummary.incentives / payrollSummary.totalPayroll) * 100,
    color: "bg-success"
  },
];

export function UpcomingPayroll() {
  return (
    <div className="rounded-xl bg-card shadow-card overflow-hidden animate-fade-in">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-card-foreground">Current Payroll</h3>
            <p className="text-sm text-muted-foreground">{payrollSummary.period}</p>
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
              {formatCurrency(payrollSummary.totalPayroll)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Total payroll for this period</p>
        </div>
        <div className="space-y-4">
          {payrollBreakdown.map((item) => (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium text-card-foreground">
                  {formatCurrency(item.amount)}
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
