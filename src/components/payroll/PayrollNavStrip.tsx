import { Link, useLocation } from "react-router-dom";
import { DollarSign, Calendar, BarChart3, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Payroll", shortLabel: "Pay", path: "/payroll", icon: DollarSign },
  { label: "Calendar", shortLabel: "Cal", path: "/payroll/calendar", icon: Calendar },
  { label: "Analytics", shortLabel: "Stats", path: "/payroll/analytics", icon: BarChart3 },
  { label: "Audit", shortLabel: "Audit", path: "/payroll/audit", icon: ShieldCheck },
];

export function PayrollNavStrip() {
  const location = useLocation();

  return (
    <nav className="rounded-lg border border-border/60 bg-muted/40 p-1 overflow-x-auto no-scrollbar">
      <div className="flex gap-0.5">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap",
                isActive
                  ? "bg-card text-foreground shadow-sm border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
