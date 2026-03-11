import { useMemo } from "react";
import { useEmployees } from "@/hooks/useEmployees";
import { useAllEmployeeBranches, BranchType } from "@/hooks/useBranches";
import { useAbsenceRecords } from "@/hooks/useAbsences";
import { useTrainingRecords } from "@/hooks/useTrainingRecords";
import { usePayrollPeriods } from "@/hooks/usePayroll";
import { useShifts } from "@/hooks/useSchedule";
import { format, differenceInDays, isToday, isFuture, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export type PulseStatus = "green" | "amber" | "red";

export interface LocationPulseItem {
  label: string;
  count: number;
  status: PulseStatus;
  href: string;
}

export interface LocationPulseSection {
  title: string;
  items: LocationPulseItem[];
  overallStatus: PulseStatus;
}

export interface LocationPulse {
  branch: BranchType;
  employeeIds: string[];
  staffCount: number;
  sections: LocationPulseSection[];
  overallStatus: PulseStatus;
}

function worstStatus(...statuses: PulseStatus[]): PulseStatus {
  if (statuses.includes("red")) return "red";
  if (statuses.includes("amber")) return "amber";
  return "green";
}

/**
 * Aggregates operational data per branch into a pulse summary.
 */
export function useLocationPulse(): { data: LocationPulse[]; isLoading: boolean } {
  const { data: employees = [], isLoading: empLoading } = useEmployees();
  const { data: branches = [], isLoading: brLoading } = useAllEmployeeBranches();
  const { data: absences = [], isLoading: absLoading } = useAbsenceRecords();
  const { data: training = [], isLoading: trLoading } = useTrainingRecords();
  const { data: periods = [], isLoading: prLoading } = usePayrollPeriods();

  const today = format(new Date(), "yyyy-MM-dd");
  const todayDate = new Date();

  // Shifts for today
  const { data: todayShifts = [], isLoading: shLoading } = useShifts(today, today);

  // Onboarding progress (all)
  const { data: onboardingProgress = [], isLoading: obLoading } = useQuery({
    queryKey: ["onboarding_progress_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_progress")
        .select("employee_id, completed")
      if (error) throw error;
      return data || [];
    },
  });

  // Contract signatures (unsigned contracts)
  const { data: documents = [], isLoading: docLoading } = useQuery({
    queryKey: ["employee_documents_contracts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_documents")
        .select("id, employee_id, document_type")
        .eq("document_type", "contract");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: signatures = [], isLoading: sigLoading } = useQuery({
    queryKey: ["contract_signatures_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_signatures")
        .select("employee_document_id");
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = empLoading || brLoading || absLoading || trLoading || prLoading || shLoading || obLoading || docLoading || sigLoading;

  const data = useMemo(() => {
    const activeEmployees = employees.filter(e => e.status === "active");
    const branchTypes: BranchType[] = ["Fitzrovia", "Carnaby", "Brixton"];
    const signedDocIds = new Set(signatures.map((s: any) => s.employee_document_id));

    return branchTypes.map((branch): LocationPulse => {
      // Employee IDs for this branch
      const branchEmpIds = new Set(
        branches.filter(b => b.branch === branch).map(b => b.employee_id)
      );
      const branchStaff = activeEmployees.filter(e => branchEmpIds.has(e.id));
      const empIds = branchStaff.map(e => e.id);

      // ── TODAY ──
      const absentToday = absences.filter(
        a => branchEmpIds.has(a.employee_id) && a.start_date <= today && a.end_date >= today
      );
      const scheduledToday = todayShifts.filter(
        (s: any) => s.employee_id && branchEmpIds.has(s.employee_id)
      );
      // Pending leave: future absences of type "holiday" (simplistic approach)
      const pendingLeave = absences.filter(
        a => branchEmpIds.has(a.employee_id) && a.absence_type === "holiday" && a.start_date > today
      );

      const todayItems: LocationPulseItem[] = [
        {
          label: "absent today",
          count: absentToday.length,
          status: absentToday.length >= 3 ? "red" : absentToday.length > 0 ? "amber" : "green",
          href: `/absences?branch=${branch}`,
        },
        {
          label: "scheduled today",
          count: scheduledToday.length,
          status: "green",
          href: `/schedule?branch=${branch}`,
        },
        {
          label: "pending leave",
          count: pendingLeave.length,
          status: pendingLeave.length > 3 ? "amber" : "green",
          href: `/holidays?branch=${branch}`,
        },
      ];

      // ── PAYROLL ──
      const latestPeriod = periods[0];
      const payrollStatus: PulseStatus = latestPeriod?.status === "draft" ? "amber" : "green";
      let cutoffDays = 0;
      if (latestPeriod?.pay_date) {
        cutoffDays = differenceInDays(parseISO(latestPeriod.pay_date), todayDate);
      }
      // Rate discrepancies: employees with very low or very high rates
      const rateIssues = branchStaff.filter(
        e => Number(e.hourly_rate) < 5 || Number(e.hourly_rate) > 50
      );

      const payrollItems: LocationPulseItem[] = [
        {
          label: cutoffDays > 0 ? `${cutoffDays}d to cut-off` : "payroll ready",
          count: cutoffDays > 0 ? cutoffDays : 0,
          status: cutoffDays > 0 && cutoffDays <= 3 ? "red" : cutoffDays <= 7 ? "amber" : "green",
          href: "/payroll",
        },
        {
          label: "rate discrepancies",
          count: rateIssues.length,
          status: rateIssues.length > 0 ? "red" : "green",
          href: `/payroll/audit?branch=${branch}`,
        },
      ];

      // ── COMPLIANCE ──
      const branchTraining = training.filter(t => branchEmpIds.has(t.employee_id));
      const overdueTraining = branchTraining.filter(
        t => t.expiry_date && t.expiry_date < today
      );
      const branchContracts = documents.filter((d: any) => branchEmpIds.has(d.employee_id));
      const unsignedContracts = branchContracts.filter(
        (d: any) => !signedDocIds.has(d.id)
      );

      const complianceItems: LocationPulseItem[] = [
        {
          label: "training overdue",
          count: overdueTraining.length,
          status: overdueTraining.length >= 3 ? "red" : overdueTraining.length > 0 ? "amber" : "green",
          href: `/training?branch=${branch}`,
        },
        {
          label: "unsigned contracts",
          count: unsignedContracts.length,
          status: unsignedContracts.length > 0 ? "amber" : "green",
          href: `/contracts?branch=${branch}`,
        },
      ];

      // ── ONBOARDING ──
      const branchOnboarding = onboardingProgress.filter(
        (o: any) => branchEmpIds.has(o.employee_id)
      );
      const incompleteOnboarding = branchOnboarding.filter((o: any) => !o.completed);
      // Group by employee to count unique employees with incomplete tasks
      const employeesWithIncomplete = new Set(
        incompleteOnboarding.map((o: any) => o.employee_id)
      );

      const onboardingItems: LocationPulseItem[] = [
        {
          label: "onboarding incomplete",
          count: employeesWithIncomplete.size,
          status: employeesWithIncomplete.size > 0 ? "amber" : "green",
          href: `/onboarding?branch=${branch}`,
        },
      ];

      // ── Build sections ──
      const sections: LocationPulseSection[] = [
        {
          title: "Today",
          items: todayItems,
          overallStatus: worstStatus(...todayItems.map(i => i.status)),
        },
        {
          title: "Payroll",
          items: payrollItems,
          overallStatus: worstStatus(...payrollItems.map(i => i.status)),
        },
        {
          title: "Compliance",
          items: complianceItems,
          overallStatus: worstStatus(...complianceItems.map(i => i.status)),
        },
        {
          title: "Onboarding",
          items: onboardingItems,
          overallStatus: worstStatus(...onboardingItems.map(i => i.status)),
        },
      ];

      return {
        branch,
        employeeIds: empIds,
        staffCount: branchStaff.length,
        sections,
        overallStatus: worstStatus(...sections.map(s => s.overallStatus)),
      };
    });
  }, [employees, branches, absences, training, periods, todayShifts, onboardingProgress, documents, signatures, today]);

  return { data, isLoading };
}
