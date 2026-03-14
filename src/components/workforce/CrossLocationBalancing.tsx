import { useMemo, useState } from "react";
import { useBranchLocations, useShifts } from "@/hooks/useSchedule";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useAllEmployeeBranches } from "@/hooks/useBranches";
import { useEmployees } from "@/hooks/useEmployees";
import { useCreateTransfer } from "@/hooks/useTransfers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowRight, AlertTriangle, CheckCircle, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function CrossLocationBalancing() {
  const today = new Date().toISOString().slice(0, 10);
  const { data: locations = [] } = useBranchLocations();
  const { data: shifts = [] } = useShifts(today, today);
  const { data: timeEntries = [] } = useTimeEntries(today, today);
  const { data: employees = [] } = useEmployees();
  const { data: allBranches = [] } = useAllEmployeeBranches();
  const createTransfer = useCreateTransfer();
  const [executing, setExecuting] = useState<string | null>(null);

  const branchStats = useMemo(() => {
    return locations.map((loc) => {
      const branchShifts = (shifts || []).filter((s: any) => s.branch === loc.branch && s.employee_id);
      const branchEntries = (timeEntries || []).filter((e: any) => e.branch === loc.branch && e.status === "clocked_in");
      const scheduled = branchShifts.length;
      const working = branchEntries.length;
      // Deficit: how many are scheduled but not working
      const gap = scheduled - working;

      return {
        location: loc,
        scheduled,
        working,
        gap,
        status: gap > 1 ? "needs_staff" : gap < -1 ? "surplus" : "balanced",
      };
    });
  }, [locations, shifts, timeEntries]);

  // Generate transfer suggestions
  const suggestions = useMemo(() => {
    const needsStaff = branchStats.filter((b) => b.status === "needs_staff");
    const surplus = branchStats.filter((b) => b.status === "surplus");
    if (needsStaff.length === 0 || surplus.length === 0) return [];

    const result: { employee: any; from: string; to: string; fromDisplay: string; toDisplay: string }[] = [];

    for (const need of needsStaff) {
      for (const src of surplus) {
        // Find employees at the surplus location who are allowed at the destination
        const srcEmployeeIds = (timeEntries || [])
          .filter((e: any) => e.branch === src.location.branch && e.status === "clocked_in")
          .map((e: any) => e.employee_id);

        for (const empId of srcEmployeeIds) {
          const empBranches = allBranches.filter((b) => b.employee_id === empId);
          if (empBranches.some((b) => b.branch === need.location.branch)) {
            const emp = employees.find((e) => e.id === empId);
            if (emp && result.length < 5) {
              result.push({
                employee: emp,
                from: src.location.branch,
                to: need.location.branch,
                fromDisplay: src.location.display_name,
                toDisplay: need.location.display_name,
              });
            }
          }
        }
      }
    }

    return result;
  }, [branchStats, timeEntries, allBranches, employees]);

  const handleQuickTransfer = async (suggestion: typeof suggestions[0]) => {
    setExecuting(suggestion.employee.id);
    try {
      await createTransfer.mutateAsync({
        employeeId: suggestion.employee.id,
        fromBranch: suggestion.from,
        toBranch: suggestion.to,
        transferDate: today,
        isTemporary: true,
        endDate: today,
        reason: "Labour balancing",
      });
      toast.success(`${suggestion.employee.forename} transferred to ${suggestion.toDisplay}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setExecuting(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-card-foreground">Staffing Balance</h3>
        <p className="text-[11px] text-muted-foreground">Cross-location overview · Today</p>
      </div>

      {/* Location strips */}
      <div className="divide-y divide-border">
        {branchStats.map((b) => (
          <div key={b.location.id} className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-card-foreground">{b.location.display_name}</span>
            </div>
            <Badge
              variant="secondary"
              className={cn(
                "text-[10px]",
                b.status === "needs_staff" && "bg-destructive/10 text-destructive",
                b.status === "surplus" && "bg-warning/10 text-warning",
                b.status === "balanced" && "bg-success/10 text-success"
              )}
            >
              {b.status === "needs_staff" && `Needs +${b.gap} staff`}
              {b.status === "surplus" && `Surplus ${Math.abs(b.gap)}`}
              {b.status === "balanced" && "Balanced"}
            </Badge>
          </div>
        ))}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="border-t border-border">
          <div className="px-4 py-2 bg-muted/30">
            <p className="text-[11px] font-medium text-muted-foreground">Suggested Transfers</p>
          </div>
          {suggestions.map((s, i) => (
            <div key={i} className="flex items-center gap-2 px-4 py-2.5 border-t border-border">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                  {s.employee.forename[0]}{s.employee.surname[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-card-foreground truncate">
                  {s.employee.forename} {s.employee.surname}
                </p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  {s.fromDisplay} <ArrowRight className="h-2.5 w-2.5" /> {s.toDisplay}
                </p>
              </div>
              <Button
                size="sm"
                className="h-7 text-[10px] rounded-lg"
                disabled={executing === s.employee.id}
                onClick={() => handleQuickTransfer(s)}
              >
                {executing === s.employee.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Move"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
