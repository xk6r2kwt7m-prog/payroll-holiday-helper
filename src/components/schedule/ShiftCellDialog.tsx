import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Calendar, Clock, MapPin, Coffee, MessageSquare, Trash2, MoreHorizontal, ChevronDown, Repeat, CalendarDays, AlertTriangle, Info } from "lucide-react";
import { useEmployeeReadiness } from "@/hooks/useOnboardingReadiness";
import type { Employee } from "@/hooks/useEmployees";
import type { RotaTermsApi } from "@/hooks/useRotaTerms";

interface ShiftCellDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  /** ISO date (yyyy-MM-dd) of the shift — used to resolve active employment terms. */
  dateIso?: string;
  /** Phase 3 — terms-aware rate resolver. When provided, cost is shown as Base + SC split. */
  rotaTerms?: RotaTermsApi;
  branch: string;
  department: string;
  employees: Employee[];
  defaultStart: string;
  defaultEnd: string;
  defaultEmployeeId?: string | null;
  existingShift?: {
    id: string;
    employee_id: string | null;
    start_time: string;
    end_time: string;
    status: string;
    notes: string | null;
    is_published?: boolean;
  };
  onSave: (data: {
    employee_id: string | null;
    start_time: string;
    end_time: string;
    notes: string;
    break_minutes?: number;
  }) => void;
  onDelete?: (id: string) => void;
  onRepeat?: (mode: string) => void;
  isPending?: boolean;
}

export function ShiftCellDialog({
  open,
  onOpenChange,
  date,
  dateIso,
  rotaTerms,
  branch,
  department,
  employees,
  defaultStart,
  defaultEnd,
  defaultEmployeeId,
  existingShift,
  onSave,
  onDelete,
  onRepeat,
  isPending,
}: ShiftCellDialogProps) {
  const [employeeId, setEmployeeId] = useState<string>("open");
  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(defaultEnd);
  const [notes, setNotes] = useState("");
  const [breakMinutes, setBreakMinutes] = useState(30);

  useEffect(() => {
    if (existingShift) {
      setEmployeeId(existingShift.employee_id || "open");
      setStartTime(existingShift.start_time?.slice(0, 5) || defaultStart);
      setEndTime(existingShift.end_time?.slice(0, 5) || defaultEnd);
      setNotes(existingShift.notes || "");
    } else {
      setEmployeeId(defaultEmployeeId || "open");
      setStartTime(defaultStart);
      setEndTime(defaultEnd);
      setNotes("");
      setBreakMinutes(30);
    }
  }, [existingShift, defaultStart, defaultEnd, defaultEmployeeId, open]);

  const handleSave = () => {
    onSave({
      employee_id: employeeId === "open" ? null : employeeId,
      start_time: startTime,
      end_time: endTime,
      notes,
      break_minutes: breakMinutes,
    });
  };

  const isEditing = !!existingShift;

  // Calculate total hours + Phase 3 base/SC split.
  // NMW + labour% must always use base only — SC is never folded into a single hidden rate.
  const totalInfo = useMemo(() => {
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    let totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    const paidMinutes = Math.max(0, totalMinutes - breakMinutes);
    const hours = paidMinutes / 60;
    const emp = employees.find(e => e.id === employeeId);

    const hasTerms = !!rotaTerms && !!dateIso && employeeId !== "open" && !!employeeId;
    let baseRate = 0;
    let guaranteedScRate = 0;
    let source: "employment_terms" | "profile_fallback" = "profile_fallback";

    if (hasTerms) {
      const rates = rotaTerms!.getRates(employeeId, dateIso!);
      baseRate = rates.base_rate;
      guaranteedScRate = rates.guaranteed_sc_rate;
      source = rates.source;
    } else if (emp) {
      baseRate = Number(emp.hourly_rate) || 0;
      guaranteedScRate = Number((emp as any).service_charge) || 0;
      source = "profile_fallback";
    }

    const baseCost = hours * baseRate;
    const scCost = hours * guaranteedScRate;
    return {
      totalMinutes,
      paidMinutes,
      hours,
      baseRate,
      guaranteedScRate,
      baseCost,
      scCost,
      source,
      hoursStr: `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m`,
    };
  }, [startTime, endTime, breakMinutes, employeeId, employees, rotaTerms, dateIso]);

  // Get selected employee and readiness
  const selectedEmployee = employees.find(e => e.id === employeeId);
  const { data: readiness } = useEmployeeReadiness(employeeId !== "open" ? employeeId : undefined);
  const displayName = selectedEmployee
    ? `${selectedEmployee.forename} ${selectedEmployee.surname}`
    : "Open Shift";
  const initials = selectedEmployee
    ? `${selectedEmployee.forename[0]}${selectedEmployee.surname?.[0] || ""}`
    : "?";

  // Format time for display
  const formatTimeDisplay = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0 gap-0 overflow-hidden">
        {/* Header — title row, well clear of the close X */}
        <div className="px-5 pt-5 pb-1">
          <p className="text-sm font-medium text-muted-foreground">{isEditing ? "Edit Shift" : "New Shift"}</p>
        </div>

        {/* Employee selector — separate from header, styled as a proper field */}
        <div className="flex items-center gap-3 px-5 pb-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="h-9 border border-border rounded-md px-3 shadow-none text-sm font-semibold text-foreground focus:ring-1 focus:ring-ring">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open Shift</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.forename} {e.surname}
                    {e.status === "starter" && (
                      <span className="ml-1.5 text-[10px] font-medium text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full">Starter</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Not-cleared / not-schedulable employee warning */}
        {readiness && (readiness.status === "not_cleared_to_work" || readiness.status === "not_ready_for_rota") && (
          <div className="mx-5 mt-1 flex items-start gap-2 p-2.5 rounded-lg bg-destructive/5 border border-destructive/10">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-destructive">
                {readiness.status === "not_cleared_to_work"
                  ? "Not cleared to work — legal requirements outstanding"
                  : "Not ready for rota — scheduling prerequisites missing"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {readiness.missingCritical.length > 0 ? readiness.missingCritical.join(", ") : readiness.missingRequired.join(", ")}
              </p>
            </div>
          </div>
        )}

        {/* Details rows — Deputy style */}
        <div className="px-5 py-3 space-y-3">
          {/* Date */}
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-foreground">{date}</span>
          </div>

          {/* Time */}
          <div className="flex items-center gap-3 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-2">
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-8 w-[120px] text-sm"
              />
              <span className="text-muted-foreground">—</span>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-8 w-[120px] text-sm"
              />
            </div>
          </div>

          {/* Location + Department */}
          <div className="flex items-center gap-3 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
              <span className="text-foreground">{department} ({branch})</span>
            </div>
          </div>

          {/* Break */}
          <div className="flex items-center gap-3 text-sm">
            <Coffee className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select
              value={String(breakMinutes)}
              onValueChange={(v) => setBreakMinutes(Number(v))}
            >
              <SelectTrigger className="h-8 w-auto min-w-[180px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No break</SelectItem>
                <SelectItem value="15">15 mins break (unpaid)</SelectItem>
                <SelectItem value="20">20 mins break (unpaid)</SelectItem>
                <SelectItem value="30">30 mins break (unpaid)</SelectItem>
                <SelectItem value="45">45 mins break (unpaid)</SelectItem>
                <SelectItem value="60">60 mins break (unpaid)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Shift note */}
          <div className="flex items-start gap-3 text-sm">
            <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
            <Input
              placeholder="Add shift note"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>

        {/* Footer — Total + actions */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/30">
          <div className="text-sm text-foreground">
            <span className="text-muted-foreground">Total </span>
            <span className="font-semibold">{totalInfo.hoursStr}</span>
            {totalInfo.cost > 0 && (
              <span className="text-muted-foreground ml-1">· £{totalInfo.cost.toFixed(2)}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {/* More menu — repeat, delete */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[220px]">
                <DropdownMenuItem onClick={() => onRepeat?.("tomorrow")} className="gap-2">
                  <Repeat className="h-3.5 w-3.5" />
                  Repeat for tomorrow
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onRepeat?.("rest_of_week")} className="gap-2">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Repeat for rest of the week
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onRepeat?.("specific_days")} className="gap-2">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Repeat for specific days
                </DropdownMenuItem>
                {isEditing && onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(existingShift!.id)}
                      className="gap-2 text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete shift
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={handleSave}
              disabled={isPending}
              size="sm"
              className="px-6"
            >
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
