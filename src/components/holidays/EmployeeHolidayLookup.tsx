import { useState, useMemo } from "react";
import { Search, User, Calendar, TrendingUp, TrendingDown, Clock, DollarSign, ChevronRight, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DepartmentFilter } from "@/components/ui/DepartmentFilter";
import { formatHours, formatCurrency, hoursToDays } from "@/hooks/useHolidays";
import { cn } from "@/lib/utils";

interface YearData {
  hoursAccrued: number;
  hoursTaken: number;
  hoursCarriedOver: number;
  totalPaid: number;
  balance: number;
}

interface EmployeeCrossYear {
  employeeId: string;
  employeeName: string;
  department: string;
  years: Record<string, YearData>;
}

interface EmployeeHolidayLookupProps {
  allYearSummaries: Record<string, {
    employeeId: string;
    employeeName: string;
    department: string;
    hoursAccrued: number;
    hoursTaken: number;
    hoursCarriedOver: number;
    totalPaid: number;
    balance: number;
  }[]>;
  onEmployeeClick?: (employeeId: string) => void;
}

export function EmployeeHolidayLookup({ allYearSummaries, onEmployeeClick }: EmployeeHolidayLookupProps) {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Merge all years into per-employee cross-year data
  const employees = useMemo(() => {
    const map = new Map<string, EmployeeCrossYear>();

    Object.entries(allYearSummaries).forEach(([year, summaries]) => {
      summaries.forEach(s => {
        if (!map.has(s.employeeId)) {
          map.set(s.employeeId, {
            employeeId: s.employeeId,
            employeeName: s.employeeName,
            department: s.department,
            years: {},
          });
        }
        map.get(s.employeeId)!.years[year] = {
          hoursAccrued: s.hoursAccrued,
          hoursTaken: s.hoursTaken,
          hoursCarriedOver: s.hoursCarriedOver,
          totalPaid: s.totalPaid,
          balance: s.balance,
        };
      });
    });

    return Array.from(map.values());
  }, [allYearSummaries]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return employees
      .filter(e => e.employeeName.toLowerCase().includes(q))
      .filter(e => deptFilter === "all" || e.department === deptFilter)
      .sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }, [employees, search, deptFilter]);

  const sortedYears = Object.keys(allYearSummaries).sort();

  const getCumulativeTotals = (emp: EmployeeCrossYear) => {
    const years = Object.values(emp.years);
    return {
      totalAccrued: years.reduce((s, y) => s + y.hoursAccrued, 0),
      totalTaken: years.reduce((s, y) => s + y.hoursTaken, 0),
      totalPaid: years.reduce((s, y) => s + y.totalPaid, 0),
      // The current outstanding balance is the latest year's balance
      // (since carry-over is already embedded in each year's calculation)
      currentBalance: years.length > 0
        ? emp.years[sortedYears[sortedYears.length - 1]]?.balance ?? 0
        : 0,
    };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search employee by name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-3">
          <DepartmentFilter value={deptFilter} onChange={setDeptFilter} className="w-[130px]" />
          <span className="text-sm text-muted-foreground">{filtered.length} employees</span>
        </div>
      </div>

      {/* Employee List */}
      <div className="space-y-2">
        {filtered.map(emp => {
          const totals = getCumulativeTotals(emp);
          const isExpanded = expandedId === emp.employeeId;
          const initials = emp.employeeName.split(" ").map(n => n[0]).join("").slice(0, 2);
          const hasOutstanding = totals.currentBalance > 0;
          const isOverdrawn = totals.currentBalance < 0;

          return (
            <div
              key={emp.employeeId}
              className="rounded-xl bg-card border border-border overflow-hidden transition-all"
            >
              {/* Summary row */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : emp.employeeId)}
                className="w-full flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors text-left"
              >
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">{emp.employeeName}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex-shrink-0">{emp.department}</Badge>
                    {isOverdrawn && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                        <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                        Overdrawn
                      </Badge>
                    )}
                    {hasOutstanding && (
                      <Badge className="text-[10px] px-1.5 py-0 flex-shrink-0 bg-accent/10 text-accent border-accent/20">
                        Unpaid balance
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>Accrued: <span className="font-medium text-foreground">{formatHours(totals.totalAccrued)} hrs</span></span>
                    <span>Taken: <span className="font-medium text-foreground">{formatHours(totals.totalTaken)} hrs</span></span>
                    <span>Paid: <span className="font-medium text-foreground">{formatCurrency(totals.totalPaid)}</span></span>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Current balance</p>
                    <p className={cn(
                      "text-lg font-bold",
                      isOverdrawn ? "text-destructive" : totals.currentBalance > 0 ? "text-accent" : "text-foreground"
                    )}>
                      {formatHours(totals.currentBalance)}
                    </p>
                  </div>
                  <ChevronRight className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    isExpanded && "rotate-90"
                  )} />
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-border bg-muted/10 p-4 space-y-4">
                  {/* Year-by-year breakdown */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 text-xs font-medium text-muted-foreground">Year</th>
                          <th className="text-right py-2 text-xs font-medium text-muted-foreground">Carried Over</th>
                          <th className="text-right py-2 text-xs font-medium text-muted-foreground">Accrued</th>
                          <th className="text-right py-2 text-xs font-medium text-muted-foreground">Total Entitlement</th>
                          <th className="text-right py-2 text-xs font-medium text-muted-foreground">Taken</th>
                          <th className="text-right py-2 text-xs font-medium text-muted-foreground">Paid</th>
                          <th className="text-right py-2 text-xs font-medium text-muted-foreground">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedYears.map(year => {
                          const data = emp.years[year];
                          if (!data) return null;
                          const entitlement = data.hoursAccrued + data.hoursCarriedOver;
                          const usagePct = entitlement > 0 ? Math.min((data.hoursTaken / entitlement) * 100, 100) : 0;
                          const yearOverdrawn = data.balance < 0;

                          return (
                            <tr key={year} className="border-b border-border last:border-0 hover:bg-muted/20">
                              <td className="py-2.5 font-medium">{year}</td>
                              <td className="text-right py-2.5 text-muted-foreground">
                                {data.hoursCarriedOver > 0 ? formatHours(data.hoursCarriedOver) : "—"}
                              </td>
                              <td className="text-right py-2.5 font-medium text-success">{formatHours(data.hoursAccrued)}</td>
                              <td className="text-right py-2.5">
                                <div className="flex items-center justify-end gap-2">
                                  <span className="font-medium">{formatHours(entitlement)}</span>
                                  <div className="w-16 hidden sm:block">
                                    <Progress value={usagePct} className={cn("h-1.5", yearOverdrawn && "[&>div]:bg-destructive")} />
                                  </div>
                                </div>
                              </td>
                              <td className="text-right py-2.5">{formatHours(data.hoursTaken)}</td>
                              <td className="text-right py-2.5 text-muted-foreground">{formatCurrency(data.totalPaid)}</td>
                              <td className={cn(
                                "text-right py-2.5 font-semibold",
                                yearOverdrawn ? "text-destructive" : data.balance > 0 ? "text-accent" : "text-foreground"
                              )}>
                                {formatHours(data.balance)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border bg-muted/20">
                          <td className="py-2.5 font-semibold text-xs text-muted-foreground" colSpan={2}>CUMULATIVE TOTAL</td>
                          <td className="text-right py-2.5 font-bold text-success text-xs">{formatHours(totals.totalAccrued)}</td>
                          <td className="text-right py-2.5 font-bold text-xs">—</td>
                          <td className="text-right py-2.5 font-bold text-xs">{formatHours(totals.totalTaken)}</td>
                          <td className="text-right py-2.5 font-bold text-muted-foreground text-xs">{formatCurrency(totals.totalPaid)}</td>
                          <td className={cn(
                            "text-right py-2.5 font-bold text-xs",
                            isOverdrawn ? "text-destructive" : totals.currentBalance > 0 ? "text-accent" : "text-foreground"
                          )}>
                            {formatHours(totals.currentBalance)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Quick insight + link */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>
                        Lifetime: <span className="font-medium text-foreground">{formatHours(totals.totalAccrued)} hrs</span> accrued across{" "}
                        <span className="font-medium text-foreground">{Object.keys(emp.years).length} years</span>
                      </p>
                      {totals.currentBalance > 0 && (
                        <p className="text-accent">
                          ⚡ {formatHours(totals.currentBalance)} hrs ({hoursToDays(totals.currentBalance)} days) still owed
                        </p>
                      )}
                    </div>
                    {onEmployeeClick && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onEmployeeClick(emp.employeeId); }}
                        className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                      >
                        View details <ChevronRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="rounded-xl bg-card border border-border p-12 text-center">
            <User className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No employees found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
