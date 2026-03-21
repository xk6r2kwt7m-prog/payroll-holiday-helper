import { useMemo } from "react";
import { useEmployees, Employee } from "@/hooks/useEmployees";
import { useAllEmployeeBranches } from "@/hooks/useBranches";
import { useAllEmployeeAvailability, EmployeeAvailability } from "@/hooks/useAvailability";
import { useAllEmployeeSkills, EmployeeSkill } from "@/hooks/useSkills";
import { useShifts } from "@/hooks/useSchedule";

interface CoverCandidate {
  employee: Employee;
  primaryBranch: string;
  allowedBranches: string[];
  roles: string[];
  skills: string[];
  languages: string[];
  availability: EmployeeAvailability[];
  isAvailableForSlot: boolean;
  isNotScheduled: boolean;
  matchScore: number;
}

export function useFindCover({
  branch,
  shiftDate,
  startTime,
  endTime,
  role,
}: {
  branch?: string;
  shiftDate?: string;
  startTime?: string;
  endTime?: string;
  role?: string;
}) {
  const { data: employees = [] } = useEmployees();
  const { data: allBranches = [] } = useAllEmployeeBranches();
  const { data: allAvailability = [] } = useAllEmployeeAvailability();
  const { data: allSkills = [] } = useAllEmployeeSkills();
  const { data: shifts = [] } = useShifts(shiftDate, shiftDate);

  const candidates = useMemo(() => {
    if (!branch || !shiftDate) return [];

    const dayOfWeek = new Date(shiftDate + "T00:00:00").getDay();

    return employees
      .filter((e) => e.status === "active" || e.status === "starter")
      .map((emp): CoverCandidate | null => {
        const empBranches = allBranches.filter((b) => b.employee_id === emp.id);
        const allowedBranches = empBranches.map((b) => b.branch);
        const primaryBranch = empBranches.find((b) => b.is_primary)?.branch || allowedBranches[0] || "";

        // Must be allowed at this branch
        if (!allowedBranches.includes(branch)) return null;

        const empSkills = allSkills.filter((s) => s.employee_id === emp.id);
        const roles = empSkills.filter((s) => s.skill_type === "role").map((s) => s.skill_value);
        const skills = empSkills.filter((s) => s.skill_type === "skill").map((s) => s.skill_value);
        const languages = empSkills.filter((s) => s.skill_type === "language").map((s) => s.skill_value);

        // Role check
        if (role && roles.length > 0 && !roles.some((r) => r.toLowerCase().includes(role.toLowerCase()))) {
          return null;
        }

        // Availability check
        const empAvail = allAvailability.filter((a) => a.employee_id === emp.id);
        const dayAvail = empAvail.find((a) => a.day_of_week === dayOfWeek);
        const isAvailableForSlot = !dayAvail || dayAvail.is_available;

        // Schedule conflict check
        const empShifts = (shifts || []).filter((s: any) => s.employee_id === emp.id);
        let isNotScheduled = true;
        if (startTime && endTime) {
          isNotScheduled = !empShifts.some((s: any) => {
            return s.start_time < endTime && s.end_time > startTime;
          });
        }

        // Score
        let matchScore = 0;
        if (isAvailableForSlot) matchScore += 3;
        if (isNotScheduled) matchScore += 3;
        if (primaryBranch === branch) matchScore += 2;
        if (role && roles.some((r) => r.toLowerCase() === role.toLowerCase())) matchScore += 2;

        return {
          employee: emp,
          primaryBranch,
          allowedBranches,
          roles,
          skills,
          languages,
          availability: empAvail,
          isAvailableForSlot,
          isNotScheduled,
          matchScore,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b as CoverCandidate).matchScore - (a as CoverCandidate).matchScore) as CoverCandidate[];
  }, [employees, allBranches, allAvailability, allSkills, shifts, branch, shiftDate, startTime, endTime, role]);

  return { candidates, isLoading: false };
}
