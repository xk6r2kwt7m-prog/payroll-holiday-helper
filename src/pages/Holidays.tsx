import { useEmployees } from "@/hooks/useEmployees";
import { filterHolidayTeam, type HolidayTeamScope } from "@/lib/holiday-team-scope";
import { Badge } from "@/components/ui/badge";
import { summariseHolidayYear } from "@/lib/holiday-year-summary";
import { addComputedCarryOver } from "@/lib/holiday-carry-over";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Calendar, DollarSign, Clock, Scale, LayoutGrid, TableIcon, Search, Users, AlertTriangle, History, BarChart3, UserSearch, ShieldCheck, Bug } from "lucide-react";
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
import { SettleLeaverDialog } from "@/components/holidays/SettleLeaverDialog";
import { AdjustHolidayBalanceDialog } from "@/components/holidays/AdjustHolidayBalanceDialog";
import { HolidayAlerts } from "@/components/holidays/HolidayAlerts";
import { DepartmentHolidaySummary } from "@/components/holidays/DepartmentHolidaySummary";
import { HolidayPaymentHistory } from "@/components/holidays/HolidayPaymentHistory";
import { EmployeeHolidayDetailSheet } from "@/components/holidays/EmployeeHolidayDetailSheet";
import { EmployeeHolidayLookup } from "@/components/holidays/EmployeeHolidayLookup";
import { HolidayFormulaBreakdown, type FormulaBreakdownData } from "@/components/holidays/HolidayFormulaBreakdown";
import { HolidayIntegrityCheck } from "@/components/holidays/HolidayIntegrityCheck";
import {
  useAllHolidayPayments,
  useAllPayrollEntriesWithHoliday,
  useAllHolidayAdjustments,
  formatCurrency,
  formatHours,
} from "@/hooks/useHolidays";
import { useLeaveRules } from "@/hooks/useLeaveRules";
import { useHolidayBalances } from "@/hooks/useHolidays";
import { usePayrollPeriods } from "@/hooks/usePayroll";
import { DepartmentFilter } from "@/components/ui/DepartmentFilter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useI18n } from "@/hooks/useI18n";
import { HolidayRequestQueue } from "@/components/holidays/HolidayRequestQueue";
import { usePermission } from "@/hooks/useRolePermissions";
import { useTenantPreferences } from "@/hooks/useTenantPreferences";
import { useTenantGuard } from "@/hooks/useTenantGuard";
import { Skeleton } from "@/components/ui/skeleton";
import { isCommittedPayrollStatus } from "@/lib/payroll-status";
import { useHolidayLedgerRows } from "@/hooks/useHolidayLedger";
import { ledgerOnlyTakenByEmployee } from "@/lib/holiday-taken-reconciliation";


const HOLIDAY_DISPLAY_DEFAULTS = {
  showBalanceSummary: true,
  showLedgerTab: true,
  defaultView: "cards" as string,
};
type ViewMode = "cards" | "table";
type DepartmentFilter = "all" | "FOH" | "BOH" | "CPU";
type LeaveYear = string;
type SubTab = "overview" | "alerts" | "history" | "departments" | "lookup" | "integrity" | "audit" | "requests";

interface EmployeeSummary {
  employeeId: string;
  employeeName: string;
  department: string;
  hoursAccrued: number;
  /** Portion of hoursAccrued that sits in OPEN (not yet approved) payroll periods. */
  pendingAccrued: number;
  requiresReview?: boolean;
  legacyBalance?: number;
  hoursTaken: number;
  hoursCarriedOver: number;
  totalPaid: number;
  balance: number;
  periodBreakdown: { periodId: string; periodName: string; accrued: number; taken: number; paid: number; isOpenPeriod?: boolean }[];
}


const Holidays = () => {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const canApproveHolidays = usePermission("approve_holidays");
  const { data: leaveRules } = useLeaveRules();
  const { data: holidayPrefs } = useTenantPreferences("holiday_display", HOLIDAY_DISPLAY_DEFAULTS);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [viewModeInit, setViewModeInit] = useState(false);
  const [teamScope, setTeamScope] = useState<HolidayTeamScope>("current");
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setToday(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<DepartmentFilter>("all");
  const [selectedYear, setSelectedYear] = useState<LeaveYear>(() => String(new Date().getFullYear()));
  const [subTab, setSubTab] = useState<SubTab>((searchParams.get("tab") as SubTab) || "overview");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [formulaBreakdownData, setFormulaBreakdownData] = useState<FormulaBreakdownData | null>(null);
  const [formulaOpen, setFormulaOpen] = useState(false);

  // Reset page-local state on tenant switch
  const resetPageState = useCallback(() => {
    setSearchQuery("");
    setDepartmentFilter("all");
    setTeamScope("current");
    setSelectedEmployeeId(null);
    setFormulaOpen(false);
  }, []);
  const { tenantReady } = useTenantGuard(resetPageState);

  // Allow deep-linking to specific tab (e.g. from Manager Home → "Review" link)
  useEffect(() => {
    const tab = searchParams.get("tab") as SubTab | null;
    if (tab && ["overview", "requests", "alerts", "history", "departments", "lookup", "integrity", "audit"].includes(tab)) {
      setSubTab(tab);
    }
  }, [searchParams]);

  // Apply stored holiday display preferences
  useEffect(() => {
    if (holidayPrefs && !viewModeInit) {
      if (holidayPrefs.defaultView === "table" || holidayPrefs.defaultView === "cards") {
        setViewMode(holidayPrefs.defaultView as ViewMode);
      }
      setViewModeInit(true);
    }
  }, [holidayPrefs, viewModeInit]);

  const employeesQuery = useEmployees(true);
  const periodsQuery = usePayrollPeriods();
  const { data: periods = [] } = periodsQuery;
  // Fetch each source once, across all pages. Historical years still feed carry-over.
  const paymentsQuery = useAllHolidayPayments();
  const balancesQuery = useHolidayBalances();
  const ledgerQuery = useHolidayLedgerRows();
  const entriesQuery = useAllPayrollEntriesWithHoliday();
  const adjustmentsQuery = useAllHolidayAdjustments();
  const { data: payrollEntries = [], isLoading: entriesLoading } = entriesQuery;
  const { data: adjustments = [] } = adjustmentsQuery;
  const sourceQueries = [employeesQuery, periodsQuery, paymentsQuery, balancesQuery, ledgerQuery, entriesQuery, adjustmentsQuery];
  const sourceError = sourceQueries.some(query => query.isError);
  const sourceLoading = sourceQueries.some(query => query.isLoading);
  const retrySources = () => { sourceQueries.forEach(query => { void query.refetch(); }); };
  const yearData = useMemo(() => {
    const byYear: Record<string, { payments: any[]; balances: any[]; ledgerRows: any[] }> = {};
    const ensure = (year: string) => byYear[year] ??= { payments: [], balances: [], ledgerRows: [] };
    const currentYear = new Date().getFullYear();
    for (let year = 2022; year <= currentYear + 1; year++) ensure(String(year));
    for (const period of periods) ensure(period.start_date.slice(0, 4));
    for (const row of paymentsQuery.data ?? []) ensure(row.leave_year_start?.slice(0, 4) || String(currentYear)).payments.push(row);
    for (const row of balancesQuery.data ?? []) ensure(row.leave_year_start.slice(0, 4)).balances.push(row);
    for (const row of ledgerQuery.data ?? []) ensure(row.leave_year_start.slice(0, 4)).ledgerRows.push(row);
    return byYear;
  }, [periods, paymentsQuery.data, balancesQuery.data, ledgerQuery.data]);
  const availableYears = Object.keys(yearData).sort();
  const currentPayments = yearData[selectedYear]?.payments ?? [];

  // Build summaries from payroll entries (accrual) + holiday payments (taken)
  // SOURCE OF TRUTH:
  //   accrued → payroll_entries.holiday_accrued_hours filtered by payroll_periods.start_date year
  //   taken   → holiday_payments.hours filtered by leave_year_start year
  //   paid    → holiday_payments.total filtered by leave_year_start year
  //   carry   → holiday_balances.hours_carried_over filtered by leave_year_start year (where available)
  //   balance → accrued + carry + adjustments - taken (computed live, never from stored totals)
  //   ledger-only taken → holiday_ledger holiday_taken / payout rows with no live
  //                        holiday_payments row (backfilled or deleted payment),
  //                        added so the dashboard matches the ledger (source of truth)
  const buildSummaries = (
    year: number,
    payments: any[],
    balances: any[],
    ledgerRows: any[] = [],
  ): EmployeeSummary[] => {
    const summaryMap = new Map<string, EmployeeSummary>();

    // Build a set of corrected period base names to exclude originals
    const correctedBaseNames = new Set<string>();
    payrollEntries.forEach((entry: any) => {
      if (!entry.payroll_periods) return;
      const name: string = entry.payroll_periods.period_name || "";
      if (name.includes("[Corrected]")) {
        correctedBaseNames.add(name.replace(" [Corrected]", "").trim());
      }
    });

    // Process payroll entries for accrued hours — filtered by payroll_periods.start_date year
    payrollEntries.forEach((entry: any) => {
      if (!entry.employees || !entry.payroll_periods) return;

      const periodName: string = entry.payroll_periods.period_name || "";
      // Skip the ORIGINAL period if a [Corrected] version exists
      if (!periodName.includes("[Corrected]") && correctedBaseNames.has(periodName.trim())) return;

      const periodStartYear = Number(entry.payroll_periods.start_date.slice(0, 4));
      // Match periods to leave year by START date (source of truth rule)
      if (periodStartYear !== year) return;

      const empId = entry.employee_id;
      const empName = `${entry.employees.forename} ${entry.employees.surname}`;
      const dept = entry.employees.department;

      if (!summaryMap.has(empId)) {
        summaryMap.set(empId, {
          employeeId: empId,
          employeeName: empName,
          department: dept,
          hoursAccrued: 0,
          pendingAccrued: 0,
          hoursTaken: 0,
          hoursCarriedOver: 0,
          totalPaid: 0,
          balance: 0,
          periodBreakdown: [],
        });
      }

      const summary = summaryMap.get(empId)!;
      const accrued = Number(entry.holiday_accrued_hours) || 0;
      const isOpenPeriod = !isCommittedPayrollStatus(entry.payroll_periods.status);
      summary.hoursAccrued += accrued;
      if (isOpenPeriod) summary.pendingAccrued += accrued;

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
          isOpenPeriod,
        });
      }
    });


    // Add holiday payments (hours taken + paid) — filtered by leave_year_start
    payments.forEach((payment: any) => {
      const empId = payment.employee_id;
      if (!empId) return;

      if (!summaryMap.has(empId)) {
        const emp = payment.employees;
        if (!emp) return;
        summaryMap.set(empId, {
          employeeId: empId,
          employeeName: payment.employee_name || `${emp.forename} ${emp.surname}`,
          department: emp.department,
          hoursAccrued: 0,
          pendingAccrued: 0,

          hoursTaken: 0,
          hoursCarriedOver: 0,
          totalPaid: 0,
          balance: 0,
          periodBreakdown: [],
        });
      }

      const summary = summaryMap.get(empId)!;
      const hours = Number(payment.hours) || 0;
      const total = Number(payment.total) || 0;
      summary.hoursTaken += hours;
      summary.totalPaid += total;

      if (payment.payroll_periods) {
        const existingPeriod = summary.periodBreakdown.find(p => p.periodId === payment.payroll_period_id);
        if (existingPeriod) {
          existingPeriod.taken += hours;
          existingPeriod.paid += total;
        } else {
          summary.periodBreakdown.push({
            periodId: payment.payroll_period_id,
            periodName: payment.payroll_periods.period_name,
            accrued: 0,
            taken: hours,
            paid: total,
          });
        }
      }
    });

    // Add holiday taken that lives ONLY in the ledger (no live holiday_payments
    // row behind it) so this dashboard matches the ledger — the source of truth.
    const livePaymentIds = new Set<string>(
      payments.map((p: any) => String(p.id)).filter(Boolean)
    );
    const ledgerOnlyTaken = ledgerOnlyTakenByEmployee(ledgerRows as any, livePaymentIds);
    ledgerOnlyTaken.forEach((hours, empId) => {
      const summary = summaryMap.get(empId);
      if (!summary) return;
      summary.hoursTaken += hours;
    });

    // Merge carry-over from holiday_balances (where available)
    const balanceMap = new Map<string, number>();
    balances.forEach((bal: any) => {
      balanceMap.set(bal.employee_id, Number(bal.hours_carried_over) || 0);
    });

    // Apply adjustments and calculate balances
    return Array.from(summaryMap.values()).map(s => {
      const accrualAdj = adjustments
        .filter((a: any) => a.employee_id === s.employeeId && a.adjustment_type === "accrued" && a.leave_year_start === `${year}-01-01`)
        .reduce((sum: number, a: any) => sum + Number(a.hours), 0);
      const takenAdj = adjustments
        .filter((a: any) => a.employee_id === s.employeeId && a.adjustment_type === "taken" && a.leave_year_start === `${year}-01-01`)
        .reduce((sum: number, a: any) => sum + Number(a.hours), 0);
      const carryAdj = adjustments
        .filter((a: any) => a.employee_id === s.employeeId && a.adjustment_type === "carried_over" && a.leave_year_start === `${year}-01-01`)
        .reduce((sum: number, a: any) => sum + Number(a.hours), 0);

      const adjustedAccrued = s.hoursAccrued + accrualAdj;
      const adjustedTaken = s.hoursTaken + takenAdj;
      // Use holiday_balances carry-over if available, otherwise use computed carry-over (from prior year)
      const storedCarry = balanceMap.get(s.employeeId) ?? 0;
      const adjustedCarry = s.hoursCarriedOver + storedCarry + carryAdj;

      return {
        ...s,
        hoursAccrued: adjustedAccrued,
        hoursTaken: adjustedTaken,
        hoursCarriedOver: adjustedCarry,
        balance: adjustedAccrued + adjustedCarry - adjustedTaken,
      };
    });
  };

  const legacyYearSummaries = useMemo(() => {
    const result: Record<string, EmployeeSummary[]> = {};
    for (const year of Object.keys(yearData).sort()) {
      const data = yearData[year];
      result[year] = addComputedCarryOver(
        buildSummaries(Number(year), data.payments, data.balances, data.ledgerRows),
        result[String(Number(year) - 1)] ?? [],
        data.balances,
      );
    }
    return result;
  }, [yearData, payrollEntries, adjustments]);
  const allYearSummaries = useMemo(() => {
    const result: Record<string, EmployeeSummary[]> = {};
    for (const [year, data] of Object.entries(yearData)) {
      const employees = new Map((legacyYearSummaries[year] ?? []).map(row => [row.employeeId, row]));
      for (const row of [...data.ledgerRows, ...data.balances]) {
        if (!employees.has(row.employee_id)) employees.set(row.employee_id, {
          employeeId: row.employee_id,
          employeeName: `${row.employees?.forename ?? ""} ${row.employees?.surname ?? ""}`.trim() || "Employee record unavailable",
          department: row.employees?.department ?? "",
          hoursAccrued: 0, pendingAccrued: 0, hoursTaken: 0, hoursCarriedOver: 0, totalPaid: 0, balance: 0, periodBreakdown: [],
        });
      }
      result[year] = [...employees.values()].map(row => {
        const summary = summariseHolidayYear(Number(year),
          data.ledgerRows.filter(e => e.employee_id === row.employeeId),
          data.payments.filter(e => e.employee_id === row.employeeId),
          payrollEntries.filter(e => e.employee_id === row.employeeId && e.payroll_periods?.start_date.slice(0, 4) === year));
        return { ...row, legacyBalance: row.balance,
          requiresReview: summary.requiresReview || Math.abs(row.balance - summary.availableIncludingPendingHours) > 0.01,
          hoursAccrued: summary.accruedIncludingPendingHours, pendingAccrued: summary.pendingAccruedHours,
          hoursTaken: summary.takenHours, hoursCarriedOver: summary.carryOverHours,
          totalPaid: summary.paidAmount, balance: summary.availableIncludingPendingHours };
      });
    }
    return result;
  }, [yearData, legacyYearSummaries, payrollEntries]);
  const currentSummaries = allYearSummaries[selectedYear] || [];
  // Filter presentation after computing balances from the full historical sources.
  const teamSummaries = useMemo(() => filterHolidayTeam(
    currentSummaries, employeesQuery.data ?? [], teamScope, today,
  ), [currentSummaries, employeesQuery.data, teamScope, today]);
  const sourceReviewCount = teamSummaries.filter(row => row.requiresReview).length;

  // Build formula breakdown for a specific employee
  const openFormulaBreakdown = useCallback((employeeId: string) => {
    const year = parseInt(selectedYear);
    const summary = currentSummaries.find(s => s.employeeId === employeeId);
    if (!summary) return;

    // Build corrected set
    const correctedBaseNames = new Set<string>();
    payrollEntries.forEach((entry: any) => {
      if (!entry.payroll_periods) return;
      const name: string = entry.payroll_periods.period_name || "";
      if (name.includes("[Corrected]")) {
        correctedBaseNames.add(name.replace(" [Corrected]", "").trim());
      }
    });

    // Get period details for this employee
    const periodDetails = payrollEntries
      .filter((entry: any) => {
        if (!entry.employees || !entry.payroll_periods || entry.employee_id !== employeeId) return false;
        const periodStartYear = Number(entry.payroll_periods.start_date.slice(0, 4));
        return periodStartYear === year;
      })
      .map((entry: any) => {
        const periodName = entry.payroll_periods.period_name || "";
        const isCorrected = periodName.includes("[Corrected]");
        const isExcluded = !isCorrected && correctedBaseNames.has(periodName.trim());
        return {
          periodId: entry.payroll_period_id,
          periodName,
          hoursWorked: Number(entry.timesheet_hours) || 0,
          importedHours: entry.imported_hours != null ? Number(entry.imported_hours) : null,
          accrualRate: leaveRules?.accrualRate ?? 0.1207,
          accrued: Number(entry.holiday_accrued_hours) || 0,
          taken: 0,
          paid: 0,
          isCorrected,
          isExcluded,
        };
      });

    // Get adjustments for this employee/year
    const empAdjustments = (yearData[selectedYear]?.ledgerRows ?? [])
      .filter((row: any) => row.employee_id === employeeId && !["accrual", "holiday_taken", "payout_on_termination", "carry_over_in"].includes(row.entry_type))
      .map((row: any) => ({ type: row.entry_type, hours: Number(row.hours), reason: row.notes ?? "Recorded ledger adjustment", date: row.entry_date }));

    const prevYear = year - 1;
    const prevSummary = allYearSummaries[String(prevYear) as LeaveYear]?.find((s: any) => s.employeeId === employeeId);
    const carryOver = summary.hoursCarriedOver;

    setFormulaBreakdownData({
      employeeName: summary.employeeName,
      department: summary.department,
      year,
      periodDetails,
      adjustments: empAdjustments,
      totalAccrued: summary.hoursAccrued,
      totalTaken: summary.hoursTaken,
      totalPaid: summary.totalPaid,
      carryOver,
      balance: summary.balance,
      carryOverSource: "Recorded carry-over in the holiday ledger",
    });
    setFormulaOpen(true);
  }, [selectedYear, currentSummaries, payrollEntries, yearData, allYearSummaries]);

  // Integrity check data
  const integrityRows = useMemo(() => {
    const rows: any[] = [];
    const allBalances = Object.fromEntries(Object.entries(yearData).map(([year, data]) => [year, data.balances]));
    
    // Build corrected set
    const correctedBaseNames = new Set<string>();
    payrollEntries.forEach((entry: any) => {
      if (!entry.payroll_periods) return;
      const name: string = entry.payroll_periods.period_name || "";
      if (name.includes("[Corrected]")) {
        correctedBaseNames.add(name.replace(" [Corrected]", "").trim());
      }
    });

    Object.entries(allBalances).forEach(([yearStr, balances]) => {
      const year = parseInt(yearStr);
      balances.forEach((bal: any) => {
        const emp = bal.employees;
        if (!emp) return;

        const storedAccrued = Number(bal.hours_accrued) || 0;

        // Calculate accrued from payroll entries (excluding superseded periods)
        const calculated = payrollEntries
          .filter((entry: any) => {
            if (!entry.payroll_periods || entry.employee_id !== bal.employee_id) return false;
            const periodName = entry.payroll_periods.period_name || "";
            if (!periodName.includes("[Corrected]") && correctedBaseNames.has(periodName.trim())) return false;
            const periodStartYear = Number(entry.payroll_periods.start_date.slice(0, 4));
            return periodStartYear === year;
          })
          .reduce((sum: number, entry: any) => sum + (Number(entry.holiday_accrued_hours) || 0), 0);

        const variance = storedAccrued - calculated;
        let severity: "ok" | "info" | "warning" | "error" = "ok";
        let explanation = "Matches payroll data";

        if (Math.abs(variance) > 50) {
          severity = "error";
          explanation = "Large variance — likely backfill/historical data or duplicate periods";
        } else if (Math.abs(variance) > 10) {
          severity = "warning";
          explanation = "Moderate variance — check corrected periods or manual adjustments";
        } else if (Math.abs(variance) > 1) {
          severity = "info";
          explanation = "Minor variance — rounding or cross-year period boundary";
        }

        // Special case: no payroll entries but stored accrued > 0 (historical seed)
        if (calculated === 0 && storedAccrued > 0) {
          severity = "info";
          explanation = "Manually seeded from historical CSV — no payroll entries for this year";
        }

        if (Math.abs(variance) > 1 || severity !== "ok") {
          rows.push({
            employeeName: `${emp.forename} ${emp.surname}`,
            department: emp.department,
            year,
            storedAccrued,
            calculatedAccrued: calculated,
            variance,
            explanation,
            severity,
          });
        }
      });
    });

    return rows;
  }, [yearData, payrollEntries]);

  // Filter summaries
  const filteredSummaries = useMemo(() => {
    return teamSummaries.filter(s => {
      const matchesSearch = s.employeeName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = departmentFilter === "all" || s.department === departmentFilter;
      return matchesSearch && matchesDept;
    });
  }, [teamSummaries, searchQuery, departmentFilter]);

  // Totals
  const totals = useMemo(() => {
    return filteredSummaries.reduce((acc, s) => ({
      accrued: acc.accrued + s.hoursAccrued,
      taken: acc.taken + s.hoursTaken,
      carryOver: acc.carryOver + s.hoursCarriedOver,
      paid: acc.paid + s.totalPaid,
      balance: acc.balance + s.balance,
    }), { accrued: 0, taken: 0, carryOver: 0, paid: 0, balance: 0 });
  }, [filteredSummaries]);

  const overdrawnCount = filteredSummaries.filter(s => s.hoursTaken > s.hoursAccrued + s.hoursCarriedOver).length;

  // Audit debug data — admin validation panel
  const auditData = useMemo(() => {
    const year = parseInt(selectedYear);

    // Count payroll entries contributing to this year
    const correctedBaseNames = new Set<string>();
    payrollEntries.forEach((entry: any) => {
      if (!entry.payroll_periods) return;
      const name: string = entry.payroll_periods.period_name || "";
      if (name.includes("[Corrected]")) {
        correctedBaseNames.add(name.replace(" [Corrected]", "").trim());
      }
    });

    const yearEntries = payrollEntries.filter((entry: any) => {
      if (!entry.employees || !entry.payroll_periods) return false;
      const periodName = entry.payroll_periods.period_name || "";
      if (!periodName.includes("[Corrected]") && correctedBaseNames.has(periodName.trim())) return false;
      const periodStartYear = Number(entry.payroll_periods.start_date.slice(0, 4));
      return periodStartYear === year;
    });

    const totalWorkedHours = yearEntries.reduce((sum: number, e: any) =>
      sum + Number(e.imported_hours ?? e.timesheet_hours ?? 0), 0);

    const totalAccruedFromEntries = yearEntries.reduce((sum: number, e: any) =>
      sum + (Number(e.holiday_accrued_hours) || 0), 0);

    const uniqueEmployeeIds = new Set(yearEntries.map((e: any) => e.employee_id));
    const uniquePeriodIds = new Set(yearEntries.map((e: any) => e.payroll_period_id));

    // Data completeness: compare employees with payroll entries vs employees with holiday_balances
    const currentBalances = yearData[String(year)]?.balances ?? [];
    const balanceEmployeeCount = currentBalances.length;
    const payrollEmployeeCount = uniqueEmployeeIds.size;
    const paymentsEmployeeCount = new Set(currentPayments.filter((p: any) => p.employee_id).map((p: any) => p.employee_id)).size;
    const isBalanceComplete = balanceEmployeeCount >= payrollEmployeeCount * 0.8; // 80% threshold

    const auditTotals = currentSummaries.reduce((acc, row) => ({
      accrued: acc.accrued + row.hoursAccrued, taken: acc.taken + row.hoursTaken,
      carryOver: acc.carryOver + row.hoursCarriedOver, paid: acc.paid + row.totalPaid,
      balance: acc.balance + row.balance,
    }), { accrued: 0, taken: 0, carryOver: 0, paid: 0, balance: 0 });
    return {
      year,
      totalPayrollEntries: payrollEntries.length,
      yearPayrollEntries: yearEntries.length,
      employeesFromPayroll: payrollEmployeeCount,
      employeesFromPayments: paymentsEmployeeCount,
      employeesInSummary: currentSummaries.length,
      employeesInBalances: balanceEmployeeCount,
      isBalanceComplete,
      periodsUsed: uniquePeriodIds.size,
      totalWorkedHours: Math.round(totalWorkedHours * 100) / 100,
      accrualFromPayrollEntries: Math.round(totalAccruedFromEntries * 100) / 100,
      accrualRate: leaveRules?.accrualRate ?? 0.1207,
      expectedAccrual: Math.round(totalWorkedHours * (leaveRules?.accrualRate ?? 0.1207) * 100) / 100,
      dashboardAccrued: Math.round(auditTotals.accrued * 100) / 100,
      dashboardTaken: Math.round(auditTotals.taken * 100) / 100,
      dashboardCarryOver: Math.round(auditTotals.carryOver * 100) / 100,
      dashboardPaid: Math.round(auditTotals.paid * 100) / 100,
      dashboardBalance: Math.round(auditTotals.balance * 100) / 100,
      overdrawnCount: currentSummaries.filter(row => row.hoursTaken > row.hoursAccrued + row.hoursCarriedOver).length,
      sourceTables: {
        accrued: "payroll_entries.holiday_accrued_hours → filtered by payroll_periods.start_date",
        taken: "holiday_payments.hours → filtered by leave_year_start",
        paid: "holiday_payments.total → filtered by leave_year_start",
        carryOver: "holiday_balances.hours_carried_over → filtered by leave_year_start (fallback: prior year computed balance)",
        adjustments: "holiday_adjustments.hours → filtered by leave_year_start",
        balance: "Computed: accrued + carry_over + adjustments − taken",
        employeeCount: "Union of employees in payroll_entries and holiday_payments for the year",
      },
    };
  }, [selectedYear, payrollEntries, currentSummaries, currentPayments, leaveRules, yearData]);

  // Alerts
  const alerts = useMemo(() => {
    return filteredSummaries
      .map(s => {
        const total = s.hoursAccrued + s.hoursCarriedOver;
        const usagePercent = total > 0 ? (s.hoursTaken / total) * 100 : 0;
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear() + 1, 0, 1);
        const expectedUsagePercent = ((now.getTime() - startOfYear.getTime()) / (endOfYear.getTime() - startOfYear.getTime())) * 100;

        if (s.hoursTaken > total) {
          return { ...s, usagePercent, expectedUsagePercent, alertType: "overdrawn" as const };
        }
        if (usagePercent > 85) {
          return { ...s, usagePercent, expectedUsagePercent, alertType: "at_risk" as const };
        }
        if (total > 40 && usagePercent < expectedUsagePercent * 0.4 && s.hoursAccrued > 50) {
          return { ...s, usagePercent, expectedUsagePercent, alertType: "low_usage" as const };
        }
        return null;
      })
      .filter(Boolean) as any[];
  }, [filteredSummaries]);

  // Department summaries
  const departmentSummaries = useMemo(() => {
    const deptMap = new Map<string, { department: string; employeeCount: number; totalAccrued: number; totalTaken: number; totalPaid: number; usageSum: number; overdrawnCount: number }>();

    filteredSummaries.forEach(s => {
      if (!deptMap.has(s.department)) {
        deptMap.set(s.department, { department: s.department, employeeCount: 0, totalAccrued: 0, totalTaken: 0, totalPaid: 0, usageSum: 0, overdrawnCount: 0 });
      }
      const d = deptMap.get(s.department)!;
      d.employeeCount++;
      d.totalAccrued += s.hoursAccrued;
      d.totalTaken += s.hoursTaken;
      d.totalPaid += s.totalPaid;
      const total = s.hoursAccrued + s.hoursCarriedOver;
      d.usageSum += total > 0 ? (s.hoursTaken / total) * 100 : 0;
      if (s.hoursTaken > total) d.overdrawnCount++;
    });

    return Array.from(deptMap.values()).map(d => ({
      ...d,
      avgUsagePercent: d.employeeCount > 0 ? d.usageSum / d.employeeCount : 0,
    }));
  }, [filteredSummaries]);

  // Payment history for table
  const paymentHistory = useMemo(() => {
    return currentPayments.map((p: any) => ({
      id: p.id,
      employeeName: p.employee_name,
      employeeId: p.employee_id,
      department: p.employees?.department || "—",
      hours: Number(p.hours),
      rate: Number(p.rate),
      total: Number(p.total),
      holidayDate: p.holiday_taken_date,
      periodName: p.payroll_periods?.period_name || "—",
      notes: p.notes,
    }));
  }, [currentPayments]);

  // Selected employee for detail sheet
  const selectedEmployee = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return currentSummaries.find(s => s.employeeId === selectedEmployeeId) || null;
  }, [selectedEmployeeId, currentSummaries]);

  const selectedEmployeePayments = useMemo(() => {
    if (!selectedEmployeeId) return [];
    return paymentHistory.filter(p => p.employeeId === selectedEmployeeId);
  }, [selectedEmployeeId, paymentHistory]);

  if (!tenantReady || sourceLoading || sourceError) {
    return (
      <AppLayout>
        <div className="space-y-3 max-w-7xl mx-auto" role="status">
          <h1 className="text-lg font-bold">Holidays</h1>
          {sourceError ? (
            <><p>Holiday balances could not be loaded completely. Please retry before recording a payment.</p>
              <Button onClick={retrySources}>Retry</Button></>
          ) : <><p>Loading holiday balances…</p><Skeleton className="h-40 w-full" /></>}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-5 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
             <h1 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 shrink-0">
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              {t("holidays.title")}
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1">
              {t("holidays.overview")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canApproveHolidays && <SettleLeaverDialog />}
            {canApproveHolidays && <AddHolidayPaymentDialog />}
          </div>
        </div>

        {sourceReviewCount > 0 && (
          <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            <strong>{sourceReviewCount} employee balance{sourceReviewCount === 1 ? " needs" : "s need"} review.</strong> The figures below use the holiday ledger plus unposted accrual. Historical records disagree or are incomplete; no entitlement has been deleted or automatically transferred.
            <Button variant="outline" size="sm" className="ml-2" onClick={() => setSubTab("integrity")}>Review sources</Button>
            <ul className="mt-2">{teamSummaries.filter(row => row.requiresReview).map(row => <li key={row.employeeId}>{row.employeeName}: ledger plus pending {formatHours(row.balance)}h; previous calculation {formatHours(row.legacyBalance ?? 0)}h.</li>)}</ul>
          </div>
        )}
        {/* Leave Year Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Tabs value={selectedYear} onValueChange={(v) => { setSelectedYear(v as LeaveYear); setSubTab("overview"); }} className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="rounded-lg border border-border/60 bg-muted/40 p-1">
                <TabsList className="flex flex-wrap w-full sm:w-auto h-auto bg-transparent gap-0.5">
                  {availableYears.map(year => (
                    <TabsTrigger key={year} value={year} className="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm">{year}</TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <div className="flex items-center gap-1.5">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSubTab("lookup")}
                  className="text-xs h-8"
                >
                  <Scale className="h-3.5 w-3.5 mr-1" /> Check Accruals
                </Button>
                <Button variant={viewMode === "cards" ? "default" : "outline"} size="sm" onClick={() => setViewMode("cards")} className="h-8 text-xs">
                  <LayoutGrid className="h-3.5 w-3.5 mr-1" /> {t("holidays.cards_view")}
                </Button>
                <Button variant={viewMode === "table" ? "default" : "outline"} size="sm" onClick={() => setViewMode("table")} className="h-8 text-xs">
                  <TableIcon className="h-3.5 w-3.5 mr-1" /> {t("holidays.table_view")}
                </Button>
              </div>
            </div>
          </Tabs>
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-2">
          <label htmlFor="holiday-team" className="text-sm font-medium">Whose holidays?</label>
          <Select value={teamScope} onValueChange={(value: HolidayTeamScope) => setTeamScope(value)}>
            <SelectTrigger id="holiday-team" className="w-full sm:w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current team</SelectItem>
              <SelectItem value="former">Former employees</SelectItem>
              <SelectItem value="all">All records</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Overview, totals, alerts and departments follow this selection. Current team includes staff working their notice.
            Former employees’ balances are retained for final settlement.
            Payment history, employee lookup and audit checks always include all records.
          </p>
          {teamScope !== "all" && <p className="text-xs text-muted-foreground">{currentSummaries.length - teamSummaries.length} other employee records hidden from this view. All records also includes future starters and records without a matching employee profile.</p>}
        </div>

        {/* Stats — conditionally show balance summary based on preference */}
        {holidayPrefs?.showBalanceSummary !== false && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              title={t("holidays.total_accrued")}
              value={formatHours(totals.accrued)}
              subtitle={`${filteredSummaries.length} ${t("common.staff")}`}
              icon={<TrendingUpIcon className="h-5 w-5" />}
              variant="accent"
            />
            <StatCard
              title={t("holidays.total_taken")}
              value={formatHours(totals.taken)}
              subtitle={`${overdrawnCount} overdrawn`}
              icon={<Clock className="h-5 w-5" />}
            />
            <StatCard
              title={t("holidays.total_balance")}
              value={formatHours(totals.balance)}
              subtitle={t("holidays.accrued") + " − " + t("holidays.taken")}
              icon={<Scale className="h-5 w-5" />}
              variant={totals.balance >= 0 ? "primary" : "accent"}
            />
            <StatCard
              title={t("holidays.total_cost")}
              value={formatCurrency(totals.paid)}
              subtitle={`${selectedYear} ${t("holidays.leave_year")}`}
              icon={<DollarSign className="h-5 w-5" />}
              variant="primary"
            />
            <StatCard
              title="Alerts"
              value={alerts.length.toString()}
              subtitle={overdrawnCount > 0 ? `${overdrawnCount} overdrawn` : "All clear"}
              icon={<AlertTriangle className="h-5 w-5" />}
              variant={alerts.length > 0 ? "warning" : "success"}
              onClick={() => setSubTab("alerts")}
            />
          </div>
        )}

        {/* Admin warning for partial data */}
        {!auditData.isBalanceComplete && (
          <div className="rounded-lg bg-warning/10 border border-warning/30 px-4 py-3 flex items-start gap-3 animate-fade-in">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong className="text-foreground">Partial historical data for {selectedYear}</strong>
              <p className="text-muted-foreground mt-0.5">
                holiday_balances covers {auditData.employeesInBalances} of {auditData.employeesFromPayroll} employees.
                Dashboard totals are computed live from payroll entries and holiday payments (reliable).
                Carry-over values for employees without balance records are derived from prior-year computed balances.
              </p>
            </div>
          </div>
        )}

        {/* Sub-navigation tabs */}
        <Tabs value={subTab} onValueChange={(v) => setSubTab(v as SubTab)}>
          <div className="rounded-lg border border-border/60 bg-muted/40 p-1">
          <TabsList className="grid w-full grid-cols-4 sm:w-auto sm:inline-grid sm:grid-cols-8 bg-transparent h-auto gap-0.5">
            <TabsTrigger value="overview" className="gap-1.5 text-xs rounded-md py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("holidays.overview")}</span>
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-1.5 text-xs rounded-md py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Calendar className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("holidays.request_holiday")}</span>
            </TabsTrigger>
            <TabsTrigger value="lookup" className="gap-1.5 text-xs rounded-md py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <UserSearch className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("common.employee")}</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-1.5 text-xs rounded-md py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("holidays.alerts_tab")}</span>
              {alerts.length > 0 && (
                <span className="ml-1 text-[10px] bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 leading-none">
                  {alerts.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 text-xs rounded-md py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <History className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("holidays.history")}</span>
            </TabsTrigger>
            <TabsTrigger value="departments" className="gap-1.5 text-xs rounded-md py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("holidays.departments_tab")}</span>
            </TabsTrigger>
            <TabsTrigger value="integrity" className="gap-1.5 text-xs rounded-md py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("holidays.integrity")}</span>
              {integrityRows.filter(r => r.severity === "error").length > 0 && (
                <span className="ml-1 text-[10px] bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 leading-none">
                  {integrityRows.filter(r => r.severity === "error").length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5 text-xs rounded-md py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Bug className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("holidays.audit")}</span>
            </TabsTrigger>
          </TabsList>
          </div>

          {/* Filters (shared across sub-tabs) */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search employees..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <DepartmentFilter value={departmentFilter} onChange={(v) => setDepartmentFilter(v as DepartmentFilter)} />
          </div>

          {(searchQuery || departmentFilter !== "all") && (
            <p className="text-xs text-muted-foreground mt-2">
              Showing {filteredSummaries.length} of {teamSummaries.length} employees
            </p>
          )}

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4">
            {entriesLoading ? (
              <LoadingSkeleton />
            ) : filteredSummaries.length === 0 ? (
              <EmptyState onClearFilters={() => { setTeamScope("all"); setSearchQuery(""); setDepartmentFilter("all"); }} />
            ) : viewMode === "cards" ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredSummaries.map((summary, index) => (
                  <div key={summary.employeeId} onClick={() => setSelectedEmployeeId(summary.employeeId)} className="cursor-pointer">
                    {summary.requiresReview && <Badge variant="outline">Balance needs review</Badge>}
                    <EmployeeHolidayCard
                      employeeName={summary.employeeName}
                      department={summary.department}
                      totalAccrued={summary.hoursAccrued}
                      totalTaken={summary.hoursTaken}
                      totalPaid={summary.totalPaid}
                      balance={summary.balance}
                      entitlement={summary.hoursAccrued + summary.hoursCarriedOver}
                      carryOver={summary.hoursCarriedOver}
                      periodBreakdown={summary.periodBreakdown}
                      index={index}
                      onViewBreakdown={() => openFormulaBreakdown(summary.employeeId)}
                    />
                  </div>
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
                  totalPaid: s.totalPaid,
                  balance: s.balance,
                  entitlement: s.hoursAccrued + s.hoursCarriedOver,
                }))}
              />
            )}
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="mt-4">
            <HolidayAlerts alerts={alerts} onEmployeeClick={setSelectedEmployeeId} />
          </TabsContent>

          {/* Payment History Tab */}
          <TabsContent value="history" className="mt-4">
            <HolidayPaymentHistory payments={paymentHistory} onEmployeeClick={setSelectedEmployeeId} />
          </TabsContent>

          {/* Department Summary Tab */}
          <TabsContent value="departments" className="mt-4">
            <DepartmentHolidaySummary departments={departmentSummaries} />
          </TabsContent>

          {/* Employee Lookup Tab - cross-year view */}
          <TabsContent value="lookup" className="mt-4">
            <EmployeeHolidayLookup
              allYearSummaries={allYearSummaries}
              onEmployeeClick={setSelectedEmployeeId}
            />
          </TabsContent>

          {/* Integrity Check Tab */}
          <TabsContent value="integrity" className="mt-4">
            <HolidayIntegrityCheck rows={integrityRows} isLoading={entriesLoading} />
          </TabsContent>

          {/* Admin Audit Debug Tab */}
          <TabsContent value="audit" className="mt-4">
            <div className="rounded-xl bg-card border border-border shadow-card p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Bug className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-card-foreground">Holiday Audit — {selectedYear}</h3>
                  <p className="text-sm text-muted-foreground">Admin validation of calculation sources and totals</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <AuditRow label="Selected Year" value={String(auditData.year)} />
                <AuditRow label="Total Payroll Entries (all years)" value={auditData.totalPayrollEntries.toLocaleString()} />
                <AuditRow label={`Payroll Entries for ${selectedYear}`} value={auditData.yearPayrollEntries.toLocaleString()} />
                <AuditRow label="Payroll Periods Used" value={auditData.periodsUsed.toLocaleString()} />
                <AuditRow label="Employees (from payroll)" value={auditData.employeesFromPayroll.toLocaleString()} />
                <AuditRow label="Employees (from payments)" value={auditData.employeesFromPayments.toLocaleString()} />
                <AuditRow label="Employees (in summary)" value={auditData.employeesInSummary.toLocaleString()} />
                <AuditRow label="Employees (in holiday_balances)" value={auditData.employeesInBalances.toLocaleString()} highlight={!auditData.isBalanceComplete} />
                <AuditRow label="Balance Data Complete?" value={auditData.isBalanceComplete ? "✅ Yes" : "⚠️ Partial"} highlight={!auditData.isBalanceComplete} />
              </div>

              {!auditData.isBalanceComplete && (
                <div className="rounded-lg bg-warning/10 border border-warning/30 p-3 text-sm text-warning">
                  <strong>⚠️ Partial Data:</strong> holiday_balances has {auditData.employeesInBalances} employees vs {auditData.employeesFromPayroll} in payroll for {selectedYear}.
                  Dashboard summaries are computed live from payroll_entries and holiday_payments (reliable). Employee-level balance records may be incomplete for carry-over tracking.
                </div>
              )}

              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-semibold text-card-foreground mb-3">Accrual Calculation</h4>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <AuditRow label="Total Worked Hours (source)" value={auditData.totalWorkedHours.toLocaleString()} />
                  <AuditRow label="Accrual Rate" value={`${(auditData.accrualRate * 100).toFixed(2)}%`} />
                  <AuditRow label="Expected Accrual (rate × hours)" value={formatHours(auditData.expectedAccrual)} />
                  <AuditRow
                    label="Actual Accrual (from DB triggers)"
                    value={formatHours(auditData.accrualFromPayrollEntries)}
                    highlight={Math.abs(auditData.accrualFromPayrollEntries - auditData.expectedAccrual) > 5}
                  />
                  <AuditRow
                    label="All records (accrued)"
                    value={formatHours(auditData.dashboardAccrued)}
                    highlight={Math.abs(auditData.dashboardAccrued - auditData.accrualFromPayrollEntries) > 1}
                  />
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-semibold text-card-foreground mb-3">All-record totals for this leave year</h4>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <AuditRow label="Hours Accrued" value={formatHours(auditData.dashboardAccrued)} />
                  <AuditRow label="Hours Carried Over" value={formatHours(auditData.dashboardCarryOver)} />
                  <AuditRow label="Hours Taken" value={formatHours(auditData.dashboardTaken)} />
                  <AuditRow label="Total Paid" value={formatCurrency(auditData.dashboardPaid)} />
                  <AuditRow label="Remaining Balance" value={formatHours(auditData.dashboardBalance)} highlight={auditData.dashboardBalance < 0} />
                  <AuditRow label="Overdrawn Count" value={String(auditData.overdrawnCount)} highlight={auditData.overdrawnCount > 0} />
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-semibold text-card-foreground mb-2">Source of Truth per Metric</h4>
                <div className="space-y-1.5">
                  {Object.entries(auditData.sourceTables).map(([metric, source]) => (
                    <div key={metric} className="flex gap-2 text-xs">
                      <span className="font-mono font-medium text-primary min-w-[100px]">{metric}:</span>
                      <span className="text-muted-foreground">{source}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
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
                            <li><strong>{leaveRules?.statutoryWeeks ?? 5.6} weeks</strong> per year</li>
                            <li>Capped at <strong>{leaveRules?.maxStatutoryDays ?? 28} days</strong> for 5+ day workers</li>
                            <li>Standard work week: {leaveRules?.standardWeekHours ?? 40} hours</li>
                          </ul>
                        </div>
                        <div className="rounded-lg bg-card p-4 border border-border">
                          <h4 className="font-medium text-card-foreground mb-2">Accrual Rate (Hourly Workers)</h4>
                          <ul className="space-y-1 list-disc list-inside">
                            <li><strong>{((leaveRules?.accrualRate ?? 0.1207) * 100).toFixed(2)}%</strong> of hours worked</li>
                            <li>Based on {leaveRules?.countryName ?? "UK"} regulations</li>
                            <li>Applied to irregular/part-year workers</li>
                          </ul>
                        </div>
                        <div className="rounded-lg bg-card p-4 border border-border">
                          <h4 className="font-medium text-card-foreground mb-2">Carryover Limits</h4>
                          <ul className="space-y-1 list-disc list-inside">
                            <li>Up to <strong>{leaveRules?.maxCarryoverDays ?? 8} days</strong> if agreed</li>
                            <li>Up to <strong>{leaveRules?.maxCarryoverFamilyLeaveDays ?? 28} days</strong> for family leave</li>
                            <li>Up to <strong>{leaveRules?.maxCarryoverSicknessDays ?? 20} days</strong> for sickness</li>
                          </ul>
                        </div>
                        <div className="rounded-lg bg-card p-4 border border-border">
                          <h4 className="font-medium text-card-foreground mb-2">Leave Year Tracking</h4>
                          <ul className="space-y-1 list-disc list-inside">
                            <li>Leave year starts: Month {leaveRules?.leaveYearStartMonth ?? 1}, Day {leaveRules?.leaveYearStartDay ?? 1}</li>
                            <li>Tracked by date holiday was taken</li>
                            <li>Balances carry forward year-to-year</li>
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

      {/* Employee Detail Sheet */}
      {selectedEmployee && (
        <EmployeeHolidayDetailSheet
          open={!!selectedEmployeeId}
          onOpenChange={(open) => { if (!open) setSelectedEmployeeId(null); }}
          employeeId={selectedEmployee.employeeId}
          employeeName={selectedEmployee.employeeName}
          department={selectedEmployee.department}
          hoursAccrued={selectedEmployee.hoursAccrued}
          pendingAccrued={selectedEmployee.pendingAccrued}

          hoursTaken={selectedEmployee.hoursTaken}
          totalPaid={selectedEmployee.totalPaid}
          balance={selectedEmployee.balance}
          carryOver={selectedEmployee.hoursCarriedOver}
          year={parseInt(selectedYear)}
          payments={selectedEmployeePayments}
          periodBreakdown={selectedEmployee.periodBreakdown.map(p => ({
            periodName: p.periodName,
            accrued: p.accrued,
            taken: p.taken,
            paid: p.paid,
            isOpenPeriod: p.isOpenPeriod,
          }))}

          allYearSummaries={
            Object.entries(allYearSummaries).reduce((acc, [year, summaries]) => {
              const empSummary = summaries.find(s => s.employeeId === selectedEmployee.employeeId);
              if (empSummary) {
                acc[year] = {
                  hoursAccrued: empSummary.hoursAccrued,
                  hoursTaken: empSummary.hoursTaken,
                  totalPaid: empSummary.totalPaid,
                  balance: empSummary.balance,
                  hoursCarriedOver: empSummary.hoursCarriedOver,
                };
              }
              return acc;
            }, {} as Record<string, { hoursAccrued: number; hoursTaken: number; totalPaid: number; balance: number; hoursCarriedOver: number }>)
          }
        />
      )}

      {/* Holiday Requests Tab Content - rendered outside Tabs but controlled by subTab */}
      {subTab === "requests" && (
        <div className="mt-4">
          <HolidayRequestQueue />
        </div>
      )}

      {/* Formula Breakdown Sheet */}
      <HolidayFormulaBreakdown
        open={formulaOpen}
        onOpenChange={setFormulaOpen}
        data={formulaBreakdownData}
      />
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

function EmptyState({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div className="rounded-xl bg-card shadow-card p-12 text-center">
      <Users className="h-8 w-8 text-primary mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">No matching holiday records</h3>
      <p className="text-muted-foreground">No records match this team, leave year and search.</p>
      <Button variant="link" onClick={onClearFilters} className="mt-2">View all employee records</Button>
    </div>
  );
}

function AuditRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg bg-muted/50 border border-border p-3">
      <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-sm font-semibold tabular-nums ${highlight ? "text-destructive" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

export default Holidays;
