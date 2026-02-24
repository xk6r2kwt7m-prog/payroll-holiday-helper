import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, ShieldAlert } from "lucide-react";
import { format, isSameDay, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ComplianceWarningsProps {
  allShifts: any[];
  employees: { id: string; forename: string; surname: string }[];
  weekDays: Date[];
}

interface Warning {
  type: "rest_period" | "weekly_hours";
  employeeId: string;
  employeeName: string;
  message: string;
  severity: "warning" | "critical";
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = (time || "00:00").split(":").map(Number);
  return h * 60 + m;
}

function getShiftDurationHours(start: string, end: string): number {
  let mins = parseTimeToMinutes(end) - parseTimeToMinutes(start);
  if (mins < 0) mins += 24 * 60;
  return mins / 60;
}

export function useComplianceWarnings(
  allShifts: any[],
  employees: { id: string; forename: string; surname: string }[],
  weekDays: Date[]
): Warning[] {
  return useMemo(() => {
    if (!allShifts?.length || !employees?.length) return [];

    const warnings: Warning[] = [];

    for (const emp of employees) {
      // Get all shifts for this employee across all branches, sorted by date+time
      const empShifts = allShifts
        .filter((s: any) => s.employee_id === emp.id)
        .sort((a: any, b: any) => {
          const dateCompare = a.shift_date.localeCompare(b.shift_date);
          if (dateCompare !== 0) return dateCompare;
          return (a.start_time || "").localeCompare(b.start_time || "");
        });

      if (empShifts.length === 0) continue;

      // Check weekly hours (UK WTR: max 48h average, warn at 44h+)
      let totalWeeklyMinutes = 0;
      for (const s of empShifts) {
        const shiftDate = new Date(s.shift_date + "T00:00:00");
        const isInWeek = weekDays.some((d) => isSameDay(d, shiftDate));
        if (isInWeek) {
          totalWeeklyMinutes += getShiftDurationHours(s.start_time, s.end_time) * 60;
        }
      }
      const weeklyHours = totalWeeklyMinutes / 60;

      if (weeklyHours > 48) {
        warnings.push({
          type: "weekly_hours",
          employeeId: emp.id,
          employeeName: `${emp.forename} ${emp.surname}`,
          message: `${emp.forename} is scheduled for ${weeklyHours.toFixed(1)}h this week — exceeds 48h WTR limit`,
          severity: "critical",
        });
      } else if (weeklyHours > 44) {
        warnings.push({
          type: "weekly_hours",
          employeeId: emp.id,
          employeeName: `${emp.forename} ${emp.surname}`,
          message: `${emp.forename} is at ${weeklyHours.toFixed(1)}h this week — approaching 48h WTR limit`,
          severity: "warning",
        });
      }

      // Check rest periods (UK WTR: 11h rest between shifts)
      for (let i = 0; i < empShifts.length - 1; i++) {
        const current = empShifts[i];
        const next = empShifts[i + 1];

        // Calculate end of current shift in minutes from midnight of current day
        const currentEndMins = parseTimeToMinutes(current.end_time);
        const nextStartMins = parseTimeToMinutes(next.start_time);

        // Calculate days between shifts
        const currentDate = new Date(current.shift_date + "T00:00:00");
        const nextDate = new Date(next.shift_date + "T00:00:00");
        const dayDiff = Math.round((nextDate.getTime() - currentDate.getTime()) / (24 * 60 * 60 * 1000));

        if (dayDiff > 1) continue; // More than 1 day gap, skip

        // Rest in minutes
        let restMinutes: number;
        if (dayDiff === 0) {
          restMinutes = nextStartMins - currentEndMins;
        } else {
          // Next day
          restMinutes = (24 * 60 - currentEndMins) + nextStartMins;
        }

        const restHours = restMinutes / 60;

        if (restHours < 11 && restHours >= 0) {
          const isInWeek =
            weekDays.some((d) => isSameDay(d, currentDate)) ||
            weekDays.some((d) => isSameDay(d, nextDate));

          if (isInWeek) {
            warnings.push({
              type: "rest_period",
              employeeId: emp.id,
              employeeName: `${emp.forename} ${emp.surname}`,
              message: `${emp.forename}: only ${restHours.toFixed(1)}h rest between ${format(currentDate, "EEE")} ${current.end_time?.slice(0, 5)} and ${format(nextDate, "EEE")} ${next.start_time?.slice(0, 5)} — min 11h required`,
              severity: restHours < 8 ? "critical" : "warning",
            });
          }
        }
      }
    }

    return warnings;
  }, [allShifts, employees, weekDays]);
}

export function ComplianceWarningsBanner({ warnings }: { warnings: Warning[] }) {
  if (warnings.length === 0) return null;

  const criticalCount = warnings.filter((w) => w.severity === "critical").length;
  const warningCount = warnings.filter((w) => w.severity === "warning").length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
            criticalCount > 0
              ? "border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10"
              : "border-amber-500/40 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:hover:bg-amber-950/30"
          )}
        >
          <ShieldAlert className="h-4 w-4" />
          {criticalCount > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              {criticalCount} critical
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/40 text-amber-600">
              {warningCount} warning{warningCount !== 1 ? "s" : ""}
            </Badge>
          )}
          <span className="text-xs">WTR Compliance</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">Working Time Regulation Alerts</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            UK law requires 11h rest between shifts and max 48h/week average
          </p>
        </div>
        <div className="max-h-[300px] overflow-y-auto divide-y divide-border">
          {warnings.map((w, i) => (
            <div key={i} className="px-4 py-2.5 flex items-start gap-2.5">
              {w.type === "rest_period" ? (
                <Clock className={cn("h-4 w-4 mt-0.5 shrink-0", w.severity === "critical" ? "text-destructive" : "text-amber-500")} />
              ) : (
                <AlertTriangle className={cn("h-4 w-4 mt-0.5 shrink-0", w.severity === "critical" ? "text-destructive" : "text-amber-500")} />
              )}
              <p className="text-xs leading-relaxed">{w.message}</p>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
