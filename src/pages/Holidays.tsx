import { useState, useMemo } from "react";
import { Calendar, DollarSign, Clock, Scale, LayoutGrid, TableIcon, Search, Users, ChevronRight } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmployeeHolidayCard } from "@/components/holidays/EmployeeHolidayCard";
import { HolidayComparisonTable } from "@/components/holidays/HolidayComparisonTable";
import { LeaveYearBalanceCard } from "@/components/holidays/LeaveYearBalanceCard";
import { AddHolidayPaymentDialog } from "@/components/holidays/AddHolidayPaymentDialog";
import { 
  useHolidayBalancesByYear,
  useHolidayPaymentsByYear,
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
type LeaveYear = "2025" | "2026";

const Holidays = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<DepartmentFilter>("all");
  const [selectedYear, setSelectedYear] = useState<LeaveYear>("2026");

  const { data: periods = [] } = usePayrollPeriods();
  
  // 2025 data - imported balances
  const { data: balances2025 = [], isLoading: loading2025 } = useHolidayBalancesByYear(2025);
  const { data: payments2025 = [] } = useHolidayPaymentsByYear(2025);
  
  // 2026 data - from payroll entries + any existing balances
  const { data: balances2026 = [], isLoading: loading2026 } = useHolidayBalancesByYear(2026);
  const { data: payments2026 = [] } = useHolidayPaymentsByYear(2026);
  const { data: payrollEntries = [], isLoading: entriesLoading } = useAllPayrollEntriesWithHoliday();

  const isLoading = loading2025 || loading2026 || entriesLoading;

  // Calculate 2025 summaries from imported balances
  const summaries2025 = useMemo(() => {
    return balances2025
      .filter((b: any) => b.employees && b.employees.status !== 'leaver')
      .map((balance: any) => {
        const emp = balance.employees;
        // Find any holiday payments for this employee in 2025
        const empPayments = payments2025.filter((p: any) => p.employee_id === balance.employee_id);
        const totalPaid = empPayments.reduce((sum: number, p: any) => sum + Number(p.total || 0), 0);
        
        return {
          employeeId: balance.employee_id,
          employeeName: `${emp.forename} ${emp.surname}`,
          department: emp.department,
          hoursAccrued: Number(balance.hours_accrued) || 0,
          hoursTaken: Number(balance.hours_taken) || 0,
          hoursCarriedOver: Number(balance.hours_carried_over) || 0,
          totalPaid,
          balance: (Number(balance.hours_accrued) || 0) + (Number(balance.hours_carried_over) || 0) - (Number(balance.hours_taken) || 0),
        };
      });
  }, [balances2025, payments2025]);

  // Calculate 2026 summaries from payroll entries (accrued) + any payments
  const summaries2026 = useMemo(() => {
    const summaryMap = new Map<string, {
      employeeId: string;
      employeeName: string;
      department: string;
      hoursAccrued: number;
      hoursTaken: number;
      hoursCarriedOver: number;
      totalPaid: number;
      periodBreakdown: { periodId: string; periodName: string; accrued: number; taken: number; paid: number }[];
    }>();

    // Process payroll entries for 2026 accrued hours
    payrollEntries.forEach((entry: any) => {
      if (!entry.employees || !entry.payroll_periods) return;
      if (entry.employees.status === 'leaver') return;
      
      // Check if this period is in 2026
      const periodStart = new Date(entry.payroll_periods.start_date);
      if (periodStart.getFullYear() !== 2026) return;
      
      const empId = entry.employee_id;
      const empName = `${entry.employees.forename} ${entry.employees.surname}`;
      const dept = entry.employees.department;
      
      if (!summaryMap.has(empId)) {
        // Check if there's a 2025 balance to carry over
        const balance2025 = summaries2025.find(s => s.employeeId === empId);
        const carryOver = balance2025 ? balance2025.balance : 0;
        
        summaryMap.set(empId, {
          employeeId: empId,
          employeeName: empName,
          department: dept,
          hoursAccrued: 0,
          hoursTaken: 0,
          hoursCarriedOver: Math.max(0, carryOver), // Only carry positive balances
          totalPaid: 0,
          periodBreakdown: [],
        });
      }
      
      const summary = summaryMap.get(empId)!;
      const accrued = Number(entry.holiday_accrued_hours) || 0;
      summary.hoursAccrued += accrued;
      
      // Add to period breakdown
      const existingPeriod = summary.periodBreakdown.find(p => p.periodId === entry.payroll_period_id);
      if (existingPeriod) {
        existingPeriod.accrued += accrued;
      } else {
        summary.periodBreakdown.push({
          periodId: entry.payroll_period_id,
          periodName: entry.payroll_periods.period_name,
          accrued,
          taken: 0,
          paid: 0,
        });
      }
    });

    // Add holiday payments for 2026
    payments2026.forEach((payment: any) => {
      if (!payment.employees) return;
      
      const empId = payment.employee_id;
      if (!empId) return;
      
      if (!summaryMap.has(empId)) {
        const emp = payment.employees;
        // Check if there's a 2025 balance to carry over
        const balance2025 = summaries2025.find(s => s.employeeId === empId);
        const carryOver = balance2025 ? balance2025.balance : 0;
        
        summaryMap.set(empId, {
          employeeId: empId,
          employeeName: `${emp.forename} ${emp.surname}`,
          department: emp.department,
          hoursAccrued: 0,
          hoursTaken: 0,
          hoursCarriedOver: Math.max(0, carryOver),
          totalPaid: 0,
          periodBreakdown: [],
        });
      }
      
      const summary = summaryMap.get(empId)!;
      const hours = Number(payment.hours) || 0;
      const total = Number(payment.total) || 0;
      summary.hoursTaken += hours;
      summary.totalPaid += total;
      
      // Add to period breakdown if period exists
      if (payment.payroll_periods) {
        const existingPeriod = summary.periodBreakdown.find(p => p.periodId === payment.payroll_period_id);
        if (existingPeriod) {
          existingPeriod.taken += hours;
          existingPeriod.paid += total;
        }
      }
    });

    return Array.from(summaryMap.values()).map(s => ({
      ...s,
      balance: s.hoursAccrued + s.hoursCarriedOver - s.hoursTaken,
    }));
  }, [payrollEntries, payments2026, summaries2025]);

  // Get current year's summaries
  const currentSummaries = selectedYear === "2025" ? summaries2025 : summaries2026;

  // Filter summaries
  const filteredSummaries = useMemo(() => {
    return currentSummaries.filter(s => {
      const matchesSearch = s.employeeName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = departmentFilter === "all" || s.department === departmentFilter;
      return matchesSearch && matchesDept;
    });
  }, [currentSummaries, searchQuery, departmentFilter]);

  // Calculate totals
  const totals = useMemo(() => {
    return filteredSummaries.reduce((acc, s) => ({
      accrued: acc.accrued + s.hoursAccrued,
      taken: acc.taken + s.hoursTaken,
      carryOver: acc.carryOver + (s.hoursCarriedOver || 0),
      paid: acc.paid + (s.totalPaid || 0),
      balance: acc.balance + s.balance,
    }), { accrued: 0, taken: 0, carryOver: 0, paid: 0, balance: 0 });
  }, [filteredSummaries]);

  const overdrawnCount = filteredSummaries.filter(s => s.hoursTaken > s.hoursAccrued + (s.hoursCarriedOver || 0)).length;

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
              Holiday Entitlement
            </h1>
            <p className="text-muted-foreground mt-1">
              Track accrued, taken, and remaining holiday by leave year
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <AddHolidayPaymentDialog />
          </div>
        </div>

        {/* Leave Year Tabs */}
        <Tabs value={selectedYear} onValueChange={(v) => setSelectedYear(v as LeaveYear)} className="animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <TabsList className="grid w-full sm:w-auto grid-cols-2">
              <TabsTrigger value="2025" className="gap-2">
                <Calendar className="h-4 w-4" />
                2025
              </TabsTrigger>
              <TabsTrigger value="2026" className="gap-2">
                <Calendar className="h-4 w-4" />
                2026
              </TabsTrigger>
            </TabsList>
            
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-6">
            <StatCard
              title="Hours Accrued"
              value={formatHours(totals.accrued)}
              subtitle={selectedYear === "2026" && totals.carryOver > 0 ? `+${formatHours(totals.carryOver)} carried over` : `${filteredSummaries.length} employees`}
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
              title="Remaining Balance"
              value={`${totals.balance >= 0 ? "" : ""}${formatHours(totals.balance)}`}
              subtitle="Accrued minus taken"
              icon={<Scale className="h-5 w-5" />}
              variant={totals.balance >= 0 ? "primary" : "accent"}
            />
            <StatCard
              title="Total Paid"
              value={formatCurrency(totals.paid)}
              subtitle={`${selectedYear} leave year`}
              icon={<DollarSign className="h-5 w-5" />}
              variant="primary"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
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
          </div>

          {/* Results info */}
          {(searchQuery || departmentFilter !== "all") && (
            <p className="text-sm text-muted-foreground mt-2">
              Showing {filteredSummaries.length} of {currentSummaries.length} employees
            </p>
          )}

          {/* Tab Content */}
          <TabsContent value="2025" className="mt-4">
            {loading2025 ? (
              <LoadingSkeleton />
            ) : filteredSummaries.length === 0 ? (
              <EmptyState hasFilters={!!(searchQuery || departmentFilter !== "all")} onClearFilters={() => { setSearchQuery(""); setDepartmentFilter("all"); }} />
            ) : viewMode === "cards" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredSummaries.map((summary, index) => (
                  <LeaveYearBalanceCard
                    key={summary.employeeId}
                    employeeName={summary.employeeName}
                    department={summary.department}
                    hoursAccrued={summary.hoursAccrued}
                    hoursTaken={summary.hoursTaken}
                    hoursCarriedOver={summary.hoursCarriedOver || 0}
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
                  totalAccrued: s.hoursAccrued,
                  totalTaken: s.hoursTaken,
                  totalPaid: s.totalPaid || 0,
                  balance: s.balance,
                  entitlement: s.hoursAccrued + (s.hoursCarriedOver || 0),
                }))}
              />
            )}
          </TabsContent>

          <TabsContent value="2026" className="mt-4">
            {isLoading ? (
              <LoadingSkeleton />
            ) : filteredSummaries.length === 0 ? (
              <EmptyState hasFilters={!!(searchQuery || departmentFilter !== "all")} onClearFilters={() => { setSearchQuery(""); setDepartmentFilter("all"); }} />
            ) : viewMode === "cards" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredSummaries.map((summary, index) => (
                  <EmployeeHolidayCard
                    key={summary.employeeId}
                    employeeName={summary.employeeName}
                    department={summary.department}
                    totalAccrued={summary.hoursAccrued + (summary.hoursCarriedOver || 0)}
                    totalTaken={summary.hoursTaken}
                    totalPaid={summary.totalPaid || 0}
                    balance={summary.balance}
                    entitlement={calculateAnnualEntitlement(UK_HOLIDAY_LAW.STANDARD_WEEK_HOURS)}
                    periodBreakdown={(summary as any).periodBreakdown || []}
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
                  totalAccrued: s.hoursAccrued + (s.hoursCarriedOver || 0),
                  totalTaken: s.hoursTaken,
                  totalPaid: s.totalPaid || 0,
                  balance: s.balance,
                  entitlement: calculateAnnualEntitlement(UK_HOLIDAY_LAW.STANDARD_WEEK_HOURS),
                }))}
              />
            )}
          </TabsContent>
        </Tabs>

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
                          <h4 className="font-medium text-card-foreground mb-2">Leave Year Tracking</h4>
                          <ul className="space-y-1 list-disc list-inside">
                            <li>Leave year: Jan 1 - Dec 31</li>
                            <li>Tracked by date holiday was taken</li>
                            <li>2025 balances carry forward to 2026</li>
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

// Helper components
function TrendingUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" />
      <polyline points="17,6 23,6 23,12" />
    </svg>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="rounded-xl bg-card p-5 shadow-card animate-pulse">
          <div className="flex items-start gap-4 mb-4">
            <div className="h-11 w-11 rounded-full bg-muted" />
            <div className="flex-1">
              <div className="h-5 w-32 bg-muted rounded mb-2" />
              <div className="h-4 w-20 bg-muted rounded" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-muted rounded" />
            <div className="h-4 w-3/4 bg-muted rounded" />
            <div className="h-4 w-1/2 bg-muted rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasFilters, onClearFilters }: { hasFilters: boolean; onClearFilters: () => void }) {
  return (
    <div className="rounded-xl bg-card shadow-card p-12 text-center animate-fade-in">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-4">
        <Users className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-card-foreground mb-2">No holiday data found</h3>
      <p className="text-muted-foreground max-w-md mx-auto">
        {hasFilters 
          ? "No employees match your current filters."
          : "Import payroll data to start tracking holiday accruals."}
      </p>
      {hasFilters && (
        <Button variant="link" onClick={onClearFilters} className="mt-2">
          Clear filters
        </Button>
      )}
    </div>
  );
}

export default Holidays;
