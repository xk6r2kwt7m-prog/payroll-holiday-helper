import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMinimumStaff, type DayOfWeek, DAY_ABBR } from "./shiftDefaults";

interface DayViewProps {
  date: Date;
  shifts: any[];
  branch: string;
  department: string;
  isAdmin: boolean;
  onAddClick: () => void;
  onEditClick: (shift: any) => void;
  onDeleteClick: (id: string) => void;
}

export function DayView({
  date,
  shifts,
  branch,
  department,
  isAdmin,
  onAddClick,
  onEditClick,
  onDeleteClick,
}: DayViewProps) {
  const dayAbbr = DAY_ABBR[date.getDay() === 0 ? 6 : date.getDay() - 1] as DayOfWeek;
  const minStaff = getMinimumStaff(branch, department as any, dayAbbr);
  const assignedCount = shifts.filter((s: any) => s.employee_id).length;
  const isUnder = assignedCount < minStaff;

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">{format(date, "EEEE d MMMM")}</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {branch} · {department} ·{" "}
            <span className={isUnder ? "text-destructive font-medium" : "text-success"}>
              {assignedCount}/{minStaff} staff
            </span>
          </p>
        </div>
        {isAdmin && (
          <Button size="sm" variant="outline" onClick={onAddClick}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {shifts.length === 0 ? (
          <p className="text-muted-foreground text-sm py-6 text-center">No shifts scheduled</p>
        ) : (
          shifts.map((shift: any) => (
            <div
              key={shift.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold",
                  shift.employee_id ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
                )}>
                  {shift.employees ? shift.employees.forename[0] : "?"}
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {shift.employees
                      ? `${shift.employees.forename} ${shift.employees.surname}`
                      : "Open Shift"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {shift.start_time?.slice(0, 5)} – {shift.end_time?.slice(0, 5)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge
                  variant={shift.status === "open" ? "outline" : "secondary"}
                  className="text-[10px]"
                >
                  {shift.status === "open" ? "Open" : "Scheduled"}
                </Badge>
                {isAdmin && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onEditClick(shift)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => onDeleteClick(shift.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
