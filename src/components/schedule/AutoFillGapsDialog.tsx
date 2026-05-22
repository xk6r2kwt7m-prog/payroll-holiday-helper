import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  suggestAssignmentForShift,
  type AutoAssignContext,
  type AutoAssignShift,
  type AutoAssignEmployee,
} from "@/lib/schedule-auto-assign";

interface AutoFillGapsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unassignedShifts: AutoAssignShift[];
  context: AutoAssignContext;
  employees: AutoAssignEmployee[];
  onApply: (assignments: { shiftId: string; employeeId: string }[]) => Promise<void> | void;
  isPending?: boolean;
}

export function AutoFillGapsDialog({
  open,
  onOpenChange,
  unassignedShifts,
  context,
  employees,
  onApply,
  isPending,
}: AutoFillGapsDialogProps) {
  const employeeName = (id: string | null) => {
    if (!id) return "—";
    const e = employees.find((x) => x.id === id) as any;
    return e ? `${e.forename ?? ""} ${e.surname ?? ""}`.trim() || e.id : id;
  };

  const suggestions = useMemo(() => {
    return unassignedShifts
      .filter((s) => !!s.id)
      .map((shift) => {
        const result = suggestAssignmentForShift(shift, context);
        return { shift, result };
      });
  }, [unassignedShifts, context]);

  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const { shift, result } of suggestions) {
      if (shift.id && result.employeeId) init[shift.id] = true;
    }
    return init;
  });

  const safeCount = suggestions.filter((s) => s.result.employeeId).length;
  const toApply = suggestions.filter((s) => s.shift.id && selected[s.shift.id!] && s.result.employeeId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]" data-testid="auto-fill-gaps-dialog">
        <DialogHeader>
          <DialogTitle>Auto-fill gaps</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Review suggestions before applying. {safeCount} of {suggestions.length} shifts have a safe candidate.
            Nothing is applied until you confirm.
          </p>
        </DialogHeader>
        <div className="max-h-[400px] overflow-y-auto space-y-1.5 py-2">
          {suggestions.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">No unassigned shifts in scope.</p>
          )}
          {suggestions.map(({ shift, result }) => (
            <div
              key={shift.id}
              className="flex items-center gap-3 p-2.5 rounded-md border border-border text-xs"
            >
              <Checkbox
                checked={!!shift.id && !!selected[shift.id]}
                disabled={!result.employeeId}
                onCheckedChange={(v) => {
                  if (!shift.id) return;
                  setSelected((prev) => ({ ...prev, [shift.id!]: !!v }));
                }}
                data-testid={`autofill-row-${shift.id}`}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium">
                  {shift.shift_date} · {shift.start_time?.slice(0, 5)}–{shift.end_time?.slice(0, 5)} · {shift.department}
                </div>
                <div className="text-muted-foreground mt-0.5">
                  {result.employeeId
                    ? `Suggested: ${employeeName(result.employeeId)}`
                    : `No safe candidate (${result.reasons.join(", ")})`}
                </div>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            disabled={isPending || toApply.length === 0}
            onClick={async () => {
              await onApply(
                toApply.map((t) => ({ shiftId: t.shift.id!, employeeId: t.result.employeeId! }))
              );
              onOpenChange(false);
            }}
            data-testid="autofill-apply"
          >
            Apply {toApply.length} assignment{toApply.length !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
