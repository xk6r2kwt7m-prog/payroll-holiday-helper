import { useState, useMemo } from "react";
import { Calendar, DollarSign, Clock, Scale, LayoutGrid, TableIcon, Filter, Search, Users } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmployeeHolidayCard } from "@/components/holidays/EmployeeHolidayCard";
import { HolidayComparisonTable } from "@/components/holidays/HolidayComparisonTable";
import { 
  useAllHolidayPayments, 
  useAllPayrollEntriesWithHoliday,
  formatCurrency, 
  formatHours, 
  UK_HOLIDAY_LAW,
  calculateAnnualEntitlement 
} from "@/hooks/useHolidays";
import { usePayrollPeriods } from "@/hooks/usePayroll";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type ViewMode = "cards" | "table";
type DepartmentFilter = "all" | "FOH" | "BOH" | "CPU";

const Holidays = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<DepartmentFilter>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");

  const { data: periods = [] } = usePayrollPeriods();
  const { data: holidayPayments = [], isLoading: paymentsLoading } = useAllHolidayPayments();
  const { data: payrollEntries = [], isLoading: entriesLoading } = useAllPayrollEntriesWithHoliday();

  const isLoading = paymentsLoading || entriesLoading;

  // Calculate per-employee holiday summaries
  const employeeSummaries = useMemo(() => {
    const summaryMap = new Map<string, {
      employeeId: string;
      employeeName: string;
      department: string;
      weeklyHours: number;
      totalAccrued: number;
      totalTaken: number;
      totalPaid: number;
      periodBreakdown: Map<string, { periodId: string; periodName: string; accrued: number; taken: number; paid: number }>;
    }>();

    // Process payroll entries for accrued hours
    payrollEntries.forEach((entry: any) => {
      if (!entry.employees || !entry.payroll_periods) return;
      
      // Filter by selected period if not "all"
      if (selectedPeriod !== "all" && entry.payroll_period_id !== selectedPeriod) return;
      
      const empId = entry.employee_id;
      const empName = `${entry.employees.forename} ${entry.employees.surname}`;
      const dept = entry.employees.department;
      
      if (!summaryMap.has(empId)) {
        summaryMap.set(empId, {
          employeeId: empId,
          employeeName: empName,
          department: dept,
          weeklyHours: UK_HOLIDAY_LAW.STANDARD_WEEK_HOURS,
          totalAccrued: 0,
          totalTaken: 0,
          totalPaid: 0,
          periodBreakdown: new Map(),
        });
      }
      
      const summary = summaryMap.get(empId)!;
      const accrued = Number(entry.holiday_accrued_hours) || 0;
      summary.totalAccrued += accrued;
      
      // Add to period breakdown
      const periodId = entry.payroll_period_id;
      const periodName = entry.payroll_periods.period_name;
      if (!summary.periodBreakdown.has(periodId)) {
        summary.periodBreakdown.set(periodId, {
          periodId,
          periodName,
          accrued: 0,
          taken: 0,
          paid: 0,
        });
      }
      summary.periodBreakdown.get(periodId)!.accrued += accrued;
    });

    // Process holiday payments for taken hours and payments
    holidayPayments.forEach((payment: any) => {
      if (!payment.employees || !payment.payroll_periods) return;
      
      // Filter by selected period if not "all"
      if (selectedPeriod !== "all" && payment.payroll_period_id !== selectedPeriod) return;
      
      const empId = payment.employee_id;
      if (!empId) return;
      
      const empName = `${payment.employees.forename} ${payment.employees.surname}`;
      const dept = payment.employees.department;
      
      if (!summaryMap.has(empId)) {
        summaryMap.set(empId, {
          employeeId: empId,
          employeeName: empName,
          department: dept,
          weeklyHours: UK_HOLIDAY_LAW.STANDARD_WEEK_HOURS,
          totalAccrued: 0,
          totalTaken: 0,
          totalPaid: 0,
          periodBreakdown: new Map(),
        });
      }
      
      const summary = summaryMap.get(empId)!;
      const hours = Number(payment.hours) || 0;
      const total = Number(payment.total) || 0;
      summary.totalTaken += hours;
      summary.totalPaid += total;
      
      // Add to period breakdown
      const periodId = payment.payroll_period_id;
      const periodName = payment.payroll_periods.period_name;
      if (!summary.periodBreakdown.has(periodId)) {
        summary.periodBreakdown.set(periodId, {
          periodId,
          periodName,
          accrued: 0,
          taken: 0,
          paid: 0,
        });
      }
      const breakdown = summary.periodBreakdown.get(periodId)!;
      breakdown.taken += hours;
      breakdown.paid += total;
    });

    // Convert to array and calculate balances & entitlements
    return Array.from(summaryMap.values()).map(s => ({
      ...s,
      balance: s.totalAccrued - s.totalTaken,
      entitlement: calculateAnnualEntitlement(s.weeklyHours),
      periodBreakdown: Array.from(s.periodBreakdown.values()),
    }));
  }, [payrollEntries, holidayPayments, selectedPeriod]);

  // Filter summaries
  const filteredSummaries = useMemo(() => {
    return employeeSummaries.filter(s => {
      const matchesSearch = s.employeeName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = departmentFilter === "all" || s.department === departmentFilter;
      return matchesSearch && matchesDept;
    });
  }, [employeeSummaries, searchQuery, departmentFilter]);

  // Calculate totals
  const totals = useMemo(() => {
    return filteredSummaries.reduce((acc, s) => ({
      accrued: acc.accrued + s.totalAccrued,
      taken: acc.taken + s.totalTaken,
      paid: acc.paid + s.totalPaid,
      balance: acc.balance + s.balance,
    }), { accrued: 0, taken: 0, paid: 0, balance: 0 });
  }, [filteredSummaries]);

  const overdrawnCount = filteredSummaries.filter(s => s.totalTaken > s.totalAccrued).length;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-slide-in-left">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              Holiday Tracking
            </h1>
            <p className="text-muted-foreground mt-1">
              {employeeSummaries.length} employees • {periods.length} payroll periods
            </p>
          </div>
          
          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "cards" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("cards")}
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              Cards
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("table")}
            >
              <TableIcon className="h-4 w-4 mr-1" />
              Table
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in">
          <StatCard
            title="Total Holiday Paid"
            value={formatCurrency(totals.paid)}
            subtitle={`${filteredSummaries.length} employees`}
            icon={<DollarSign className="h-5 w-5" />}
            variant="primary"
          />
          <StatCard
            title="Hours Accrued"
            value={formatHours(totals.accrued)}
            subtitle="Total across all employees"
            icon={<TrendingUpIcon className="h-5 w-5" />}
            variant="accent"
          />
          <StatCard
            title="Hours Taken"
            value={formatHours(totals.taken)}
            subtitle={`${overdrawnCount} overdrawn`}
            icon={<Clock className="h-5 w-5" />}
          />
          <StatCard
            title="Net Balance"
            value={`${totals.balance >= 0 ? "+" : ""}${formatHours(totals.balance)}`}
            subtitle="Accrued minus taken"
            icon={<Scale className="h-5 w-5" />}
            variant={totals.balance >= 0 ? "accent" : "primary"}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 animate-fade-in">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={departmentFilter} onValueChange={(v) => setDepartmentFilter(v as DepartmentFilter)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Depts</SelectItem>
              <SelectItem value="FOH">🍽️ FOH</SelectItem>
              <SelectItem value="BOH">👨‍🍳 BOH</SelectItem>
              <SelectItem value="CPU">🏭 CPU</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Payroll Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Periods</SelectItem>
              {periods.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.period_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Results info */}
        {(searchQuery || departmentFilter !== "all" || selectedPeriod !== "all") && (
          <p className="text-sm text-muted-foreground animate-fade-in">
            Showing {filteredSummaries.length} of {employeeSummaries.length} employees
          </p>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl bg-card p-5 shadow-card animate-pulse">
                <div className="flex items-start gap-4 mb-4">
                  <div className="h-12 w-12 rounded-full bg-muted" />
                  <div className="flex-1">
                    <div className="h-5 w-32 bg-muted rounded mb-2" />
                    <div className="h-4 w-20 bg-muted rounded" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="h-16 bg-muted rounded" />
                  <div className="h-16 bg-muted rounded" />
                  <div className="h-16 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredSummaries.length === 0 && (
          <div className="rounded-xl bg-card shadow-card p-12 text-center animate-fade-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-card-foreground mb-2">No holiday data found</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {employeeSummaries.length === 0 
                ? "Import payroll data to start tracking holiday accruals and payments."
                : "No employees match your current filters."}
            </p>
            {(searchQuery || departmentFilter !== "all") && (
              <Button 
                variant="link" 
                onClick={() => {
                  setSearchQuery("");
                  setDepartmentFilter("all");
                }}
                className="mt-2"
              >
                Clear filters
              </Button>
            )}
          </div>
        )}

        {/* Content */}
        {!isLoading && filteredSummaries.length > 0 && (
          viewMode === "cards" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSummaries.map((summary, index) => (
                <EmployeeHolidayCard
                  key={summary.employeeId}
                  employeeName={summary.employeeName}
                  department={summary.department}
                  totalAccrued={summary.totalAccrued}
                  totalTaken={summary.totalTaken}
                  totalPaid={summary.totalPaid}
                  balance={summary.balance}
                  entitlement={summary.entitlement}
                  periodBreakdown={summary.periodBreakdown}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <HolidayComparisonTable
              data={filteredSummaries.map(s => ({
                employeeId: s.employeeId,
                employeeName: s.employeeName,
                department: s.department,
                totalAccrued: s.totalAccrued,
                totalTaken: s.totalTaken,
                totalPaid: s.totalPaid,
                balance: s.balance,
                entitlement: s.entitlement,
              }))}
            />
          )
        )}

        {/* UK Holiday Law Info Card */}
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-6 animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
              <Scale className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-card-foreground mb-2">UK Holiday Law Compliance</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Holiday calculations follow the <strong>Working Time Regulations 1998</strong> (updated January 2024).
              </p>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="rules" className="border-primary/20">
                  <AccordionTrigger className="text-sm font-medium text-card-foreground hover:no-underline">
                    View Calculation Rules
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 text-sm text-muted-foreground pt-2">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-lg bg-card p-4 border border-border">
                          <h4 className="font-medium text-card-foreground mb-2">Statutory Entitlement</h4>
                          <ul className="space-y-1 list-disc list-inside">
                            <li><strong>{UK_HOLIDAY_LAW.STATUTORY_WEEKS} weeks</strong> per year</li>
                            <li>Capped at <strong>{UK_HOLIDAY_LAW.MAX_STATUTORY_DAYS} days</strong> for 5+ day workers</li>
                            <li>{UK_HOLIDAY_LAW.NORMAL_LEAVE_WEEKS} weeks normal + {UK_HOLIDAY_LAW.BASIC_LEAVE_WEEKS} weeks basic</li>
                          </ul>
                        </div>
                        <div className="rounded-lg bg-card p-4 border border-border">
                          <h4 className="font-medium text-card-foreground mb-2">Accrual Rate (Hourly Workers)</h4>
                          <ul className="space-y-1 list-disc list-inside">
                            <li><strong>{(UK_HOLIDAY_LAW.ACCRUAL_RATE * 100).toFixed(2)}%</strong> of hours worked</li>
                            <li>Formula: 5.6 ÷ (52 - 5.6) × 100</li>
                            <li>Applied to irregular/part-year workers</li>
                          </ul>
                        </div>
                        <div className="rounded-lg bg-card p-4 border border-border">
                          <h4 className="font-medium text-card-foreground mb-2">Carryover Limits</h4>
                          <ul className="space-y-1 list-disc list-inside">
                            <li>Up to <strong>{UK_HOLIDAY_LAW.MAX_CARRYOVER_AGREED} days</strong> if agreed</li>
                            <li>Up to <strong>{UK_HOLIDAY_LAW.MAX_CARRYOVER_FAMILY_LEAVE} days</strong> for family leave</li>
                            <li>Up to <strong>{UK_HOLIDAY_LAW.MAX_CARRYOVER_SICKNESS} days</strong> for sickness</li>
                          </ul>
                        </div>
                        <div className="rounded-lg bg-card p-4 border border-border">
                          <h4 className="font-medium text-card-foreground mb-2">Rounding Rules</h4>
                          <ul className="space-y-1 list-disc list-inside">
                            <li>Less than 30 mins → round <strong>down</strong></li>
                            <li>30 mins or more → round <strong>up</strong></li>
                            <li>Applied to accrued hours</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

// Helper component for the icon
function TrendingUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" />
      <polyline points="17,6 23,6 23,12" />
    </svg>
  );
}

export default Holidays;
