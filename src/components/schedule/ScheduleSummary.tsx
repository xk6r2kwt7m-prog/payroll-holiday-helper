import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, Check, Users, Clock, DollarSign, Eye } from "lucide-react";
import { isSameDay } from "date-fns";
import { getMinimumStaff, type DayOfWeek, DAY_ABBR } from "./shiftDefaults";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { useState } from "react";

interface ScheduleSummaryProps {
  shifts: any[];
  weekDays: Date[];
  branch: string;
  department: string;
  employees: { id: string; forename: string; surname: string; hourly_rate: number; department: string; status: string }[];
  complianceWarningCount: number;
}

interface CoverageDay {
  date: Date;
  assigned: number;
  minimum: number;
  status: "ok" | "warning" | "critical";
  label: string;
  dayAbbr: string;
}

export function ScheduleSummary({
  shifts,
  weekDays,
  branch,
  department,
  employees,
  complianceWarningCount,
}: ScheduleSummaryProps) {
  const [gapDrawerOpen, setGapDrawerOpen] = useState(false);

  const deptEmployees = useMemo(
    () => employees.filter((e) => e.department === department && e.status === "active"),
    [employees, department]
  );

  const branchDeptShifts = useMemo(
    () => shifts.filter((s: any) => s.branch === branch && s.department === department),
    [shifts, branch, department]
  );

  const coverage: CoverageDay[] = useMemo(() => {
    return weekDays.map((day) => {
      const dayAbbr = DAY_ABBR[day.getDay() === 0 ? 6 : day.getDay() - 1] as DayOfWeek;
      const dayShifts = branchDeptShifts.filter((s: any) =>
        isSameDay(new Date(s.shift_date + "T00:00:00"), day)
      );
      const assigned = dayShifts.filter((s: any) => s.employee_id).length;
      const minimum = getMinimumStaff(branch, department as any, dayAbbr);
      const status = assigned >= minimum ? "ok" : assigned === 0 ? "critical" : "warning";
      return {
        date: day,
        assigned,
        minimum,
        status,
        label: assigned >= minimum
          ? "Covered"
          : `Need ${minimum - assigned} more`,
        dayAbbr,
      };
    });
  }, [weekDays, branchDeptShifts, branch, department]);

  const stats = useMemo(() => {
    const totalShifts = branchDeptShifts.length;
    const assignedShifts = branchDeptShifts.filter((s: any) => s.employee_id).length;
    const unassigned = totalShifts - assignedShifts;
    const published = branchDeptShifts.filter((s: any) => s.is_published).length;
    const understaffedDays = coverage.filter((c) => c.status !== "ok").length;

    // Employees with 0 shifts
    const employeesWithShifts = new Set(
      branchDeptShifts.filter((s: any) => s.employee_id).map((s: any) => s.employee_id)
    );
    const unscheduledEmployees = deptEmployees.filter((e) => !employeesWithShifts.has(e.id));

    // Estimated labour cost
    let totalCost = 0;
    for (const shift of branchDeptShifts) {
      if (!shift.employee_id) continue;
      const emp = employees.find((e) => e.id === shift.employee_id);
      const rate = Number(emp?.hourly_rate) || 0;
      const [sh, sm] = (shift.start_time || "00:00").split(":").map(Number);
      const [eh, em] = (shift.end_time || "00:00").split(":").map(Number);
      let mins = (eh * 60 + em) - (sh * 60 + sm);
      if (mins < 0) mins += 24 * 60;
      totalCost += (mins / 60) * rate;
    }

    return { totalShifts, assignedShifts, unassigned, published, understaffedDays, unscheduledEmployees, totalCost };
  }, [branchDeptShifts, coverage, deptEmployees, employees]);

  const gapDays = coverage.filter((c) => c.status !== "ok");

  return (
    <>
      {/* Coverage strip — horizontal scrollable day indicators */}
      <div className="flex items-stretch gap-1.5 overflow-x-auto no-scrollbar py-1">
        {coverage.map((day) => (
          <button
            key={day.date.toISOString()}
            onClick={() => day.status !== "ok" && setGapDrawerOpen(true)}
            className={cn(
              "flex flex-col items-center rounded-lg px-2.5 py-1.5 min-w-[48px] text-center transition-colors",
              day.status === "ok" && "bg-success/10 border border-success/20",
              day.status === "warning" && "bg-warning/10 border border-warning/30 cursor-pointer",
              day.status === "critical" && "bg-destructive/10 border border-destructive/30 cursor-pointer animate-pulse",
            )}
          >
            <span className="text-[10px] font-medium text-muted-foreground">{day.dayAbbr}</span>
            <span className={cn(
              "text-sm font-bold",
              day.status === "ok" && "text-success",
              day.status === "warning" && "text-warning",
              day.status === "critical" && "text-destructive",
            )}>
              {day.assigned}/{day.minimum}
            </span>
            {day.status !== "ok" && (
              <AlertTriangle className={cn(
                "h-3 w-3 mt-0.5",
                day.status === "warning" ? "text-warning" : "text-destructive"
              )} />
            )}
          </button>
        ))}
      </div>

      {/* Quick stats row */}
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar text-xs py-1">
        <div className="flex items-center gap-1 text-muted-foreground whitespace-nowrap">
          <Users className="h-3 w-3" />
          <span className="font-medium text-foreground">{stats.totalShifts}</span> shifts
        </div>
        {stats.unassigned > 0 && (
          <div className="flex items-center gap-1 text-warning whitespace-nowrap">
            <Eye className="h-3 w-3" />
            <span className="font-medium">{stats.unassigned}</span> open
          </div>
        )}
        {stats.understaffedDays > 0 && (
          <div className="flex items-center gap-1 text-destructive whitespace-nowrap">
            <AlertTriangle className="h-3 w-3" />
            <span className="font-medium">{stats.understaffedDays}</span> gap{stats.understaffedDays !== 1 ? "s" : ""}
          </div>
        )}
        {stats.unscheduledEmployees.length > 0 && (
          <div className="flex items-center gap-1 text-muted-foreground whitespace-nowrap">
            <Users className="h-3 w-3" />
            <span className="font-medium">{stats.unscheduledEmployees.length}</span> unscheduled
          </div>
        )}
        {stats.totalCost > 0 && (
          <div className="flex items-center gap-1 text-muted-foreground whitespace-nowrap">
            <DollarSign className="h-3 w-3" />
            £{stats.totalCost.toFixed(0)}
          </div>
        )}
        {complianceWarningCount > 0 && (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 shrink-0">
            {complianceWarningCount} WTR
          </Badge>
        )}
      </div>

      {/* Gap detail drawer */}
      <Drawer open={gapDrawerOpen} onOpenChange={setGapDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Staffing Gaps — {department} at {branch}</DrawerTitle>
            <DrawerDescription>
              {gapDays.length} day{gapDays.length !== 1 ? "s" : ""} need attention this week
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-3 max-h-[60vh] overflow-y-auto">
            {gapDays.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <Check className="h-8 w-8 mx-auto mb-2 text-success" />
                All days are fully covered!
              </div>
            ) : (
              gapDays.map((day) => (
                <div
                  key={day.date.toISOString()}
                  className={cn(
                    "rounded-xl p-4 border",
                    day.status === "critical"
                      ? "border-destructive/30 bg-destructive/5"
                      : "border-warning/30 bg-warning/5"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">
                      {day.dayAbbr} {day.date.getDate()}
                    </span>
                    <Badge
                      variant={day.status === "critical" ? "destructive" : "outline"}
                      className="text-[10px]"
                    >
                      {day.assigned}/{day.minimum} staff
                    </Badge>
                  </div>
                  <p className={cn(
                    "text-sm",
                    day.status === "critical" ? "text-destructive" : "text-warning"
                  )}>
                    {day.assigned === 0
                      ? `No ${department} staff assigned — need ${day.minimum} shifts`
                      : `Need ${day.minimum - day.assigned} more ${department} shift${day.minimum - day.assigned > 1 ? "s" : ""}`
                    }
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tap an empty cell on this day to quickly add a shift.
                  </p>
                </div>
              ))
            )}

            {stats.unscheduledEmployees.length > 0 && (
              <div className="rounded-xl p-4 border border-border bg-muted/30">
                <p className="text-sm font-medium mb-2">Available {department} staff with no shifts:</p>
                <div className="flex flex-wrap gap-1.5">
                  {stats.unscheduledEmployees.map((emp) => (
                    <Badge key={emp.id} variant="secondary" className="text-xs">
                      {emp.forename} {emp.surname?.[0]}.
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
