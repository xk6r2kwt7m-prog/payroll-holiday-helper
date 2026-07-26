/**
 * Employee-level payroll change review pop-up.
 *
 * Read-only view of previous vs current values across rate, service
 * charge, hours (total + weekly average), bonuses, holiday pay, gross
 * pay, plus the ability to add a period note (internal or PDF-visible).
 * Never mutates payroll data.
 */
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { EmployeeChange } from "@/lib/payroll-change-review";
import {
  usePayrollPeriodNotes,
  useCreatePayrollPeriodNote,
  useUpdatePayrollPeriodNoteVisibility,
  type PayrollPeriodNote,
} from "@/hooks/usePayrollPeriodNotes";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employeeId: string;
  employeeName: string;
  periodId: string;
  periodName: string;
  previousPeriodName?: string;
  change: EmployeeChange | undefined;
  canEdit: boolean;
  /**
   * Phase 2 feature flag. When false (default), the pop-up is a strict
   * read-only view: no note list, no note creation, no PDF toggles.
   * Phase 1 keeps this off — the comparison surface must not write data.
   */
  notesEnabled?: boolean;
}

const CATEGORIES = [
  { value: "rate", label: "Rate change" },
  { value: "service_charge", label: "Service charge change" },
  { value: "timesheet", label: "Timesheet import" },
  { value: "manual_adjustment", label: "Manual adjustment" },
  { value: "holiday", label: "Holiday pay" },
  { value: "bonus", label: "Bonus" },
  { value: "other", label: "Other" },
] as const;

const fmtMoney = (v: number) => `£${(v || 0).toFixed(2)}`;
const fmtHours = (v: number) => `${(v || 0).toFixed(2)}h`;

export function EmployeeChangeReviewDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  periodId,
  periodName,
  previousPeriodName,
  change,
  canEdit,
  notesEnabled = false,
}: Props) {
  const { data: allNotes = [] } = usePayrollPeriodNotes(notesEnabled ? periodId : undefined);
  const notes = useMemo(
    () => allNotes.filter((n: PayrollPeriodNote) => n.employee_id === employeeId),
    [allNotes, employeeId],
  );
  const createNote = useCreatePayrollPeriodNote();
  const updateVis = useUpdatePayrollPeriodNoteVisibility();

  const [text, setText] = useState("");
  const [category, setCategory] = useState<string>("other");
  const [showOnPdf, setShowOnPdf] = useState(false);

  const handleAdd = async () => {
    if (!text.trim()) return;
    // Prevent duplicates (same employee + same text within the period).
    const dup = notes.some(
      (n) => n.note.trim().toLowerCase() === text.trim().toLowerCase(),
    );
    if (dup) {
      toast.info("An identical note already exists for this employee.");
      return;
    }
    try {
      await createNote.mutateAsync({
        payroll_period_id: periodId,
        employee_id: employeeId,
        note: text.trim(),
        category,
        show_on_pdf: showOnPdf,
      });
      toast.success(showOnPdf ? "Note added — will appear on PDF" : "Internal note added");
      setText("");
      setShowOnPdf(false);
      setCategory("other");
    } catch {
      toast.error("Failed to add note");
    }
  };

  const rows = useMemo(() => {
    if (!change) return [];
    return [
      {
        key: "rate",
        label: "Hourly rate",
        prev: fmtMoney(change.rate.prev),
        curr: fmtMoney(change.rate.curr),
        changed: change.rate.changed,
        severity: change.rate.severity,
        message: change.rate.message,
      },
      {
        key: "service_charge",
        label: "Service charge",
        prev: fmtMoney(change.service_charge.prev),
        curr: fmtMoney(change.service_charge.curr),
        changed: change.service_charge.changed,
        severity: change.service_charge.severity,
        message: change.service_charge.message,
      },
      {
        key: "hours_total",
        label: "Timesheet hours (total)",
        prev: fmtHours(change.hours.prev_total),
        curr: fmtHours(change.hours.curr_total),
        changed: Math.abs(change.hours.prev_total - change.hours.curr_total) > 0.01,
        severity: change.hours.severity,
        message: change.hours.message,
      },
      {
        key: "hours_weekly",
        label: `Weekly average (${change.hours.prev_weeks}w → ${change.hours.curr_weeks}w)`,
        prev: fmtHours(change.hours.prev_weekly_avg),
        curr: fmtHours(change.hours.curr_weekly_avg),
        changed:
          Math.abs(change.hours.prev_weekly_avg - change.hours.curr_weekly_avg) > 0.05,
        severity: change.hours.severity,
        message: change.hours.pct_weekly_change !== null
          ? `${change.hours.pct_weekly_change > 0 ? "+" : ""}${change.hours.pct_weekly_change.toFixed(0)}%`
          : undefined,
      },
      {
        key: "bonus",
        label: "Bonuses (perf + spec)",
        prev: fmtMoney(change.bonus.prev),
        curr: fmtMoney(change.bonus.curr),
        changed: change.bonus.changed,
        severity: change.bonus.severity,
      },
      {
        key: "holiday_pay",
        label: "Holiday pay",
        prev: fmtMoney(change.holiday_pay.prev),
        curr: fmtMoney(change.holiday_pay.curr),
        changed: change.holiday_pay.changed,
        severity: change.holiday_pay.severity,
      },
      {
        key: "gross_pay",
        label: "Gross pay",
        prev: fmtMoney(change.gross_pay.prev),
        curr: fmtMoney(change.gross_pay.curr),
        changed: change.gross_pay.changed,
        severity: change.gross_pay.severity,
        message: change.gross_pay.pct !== null && change.gross_pay.changed
          ? `${change.gross_pay.pct > 0 ? "+" : ""}${change.gross_pay.pct.toFixed(0)}%`
          : undefined,
      },
    ];
  }, [change]);

  const sevClass = (s: string) =>
    s === "red"
      ? "bg-destructive/10 text-destructive"
      : s === "amber"
        ? "bg-warning/10 text-warning"
        : s === "info"
          ? "bg-muted text-muted-foreground"
          : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">
            {employeeName} — payroll changes
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {previousPeriodName ? `${previousPeriodName} → ${periodName}` : periodName}
            {change?.is_new_starter && (
              <Badge variant="outline" className="ml-2 text-[10px]">New starter</Badge>
            )}
            {change?.is_leaver && (
              <Badge variant="outline" className="ml-2 text-[10px]">Leaver</Badge>
            )}
          </p>
        </DialogHeader>

        {!change ? (
          <p className="text-sm text-muted-foreground">No comparison available.</p>
        ) : (
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Field</th>
                  <th className="text-right px-3 py-2 font-medium">Previous</th>
                  <th className="text-right px-3 py-2 font-medium">Current</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.key} className={r.changed ? sevClass(r.severity) : ""}>
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.label}</div>
                      {r.message && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {r.message}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.prev}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">{r.curr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {change && change.manual_adjustment_count > 0 && (
          <p className="text-[11px] text-muted-foreground">
            {change.manual_adjustment_count} manual adjustment{change.manual_adjustment_count === 1 ? "" : "s"} recorded for this entry.
          </p>
        )}

        {notesEnabled && (
          <>
            <div className="space-y-2">
              <p className="text-xs font-medium">Existing notes</p>
              {notes.length === 0 ? (
                <p className="text-xs text-muted-foreground">No notes for this employee in this period.</p>
              ) : (
                <div className="space-y-1.5 max-h-32 overflow-auto">
                  {notes.map((n) => (
                    <div
                      key={n.id}
                      className="flex items-start justify-between gap-2 rounded border border-border/60 bg-muted/30 p-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs">{n.note}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {n.category ?? "note"} · {new Date(n.created_at).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                      {canEdit && (
                        <label className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                          <Checkbox
                            checked={n.show_on_pdf}
                            onCheckedChange={(v) =>
                              updateVis.mutate({ id: n.id, show_on_pdf: v === true })
                            }
                          />
                          PDF
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {canEdit && (
              <div className="space-y-2 rounded-md border border-border p-3">
                <p className="text-xs font-medium">Add note</p>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value} className="text-xs">
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Note (e.g. rate uplift from 1 June)"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="min-h-[60px] text-xs"
                />
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox
                    checked={showOnPdf}
                    onCheckedChange={(v) => setShowOnPdf(v === true)}
                  />
                  Show this note on payroll PDF
                </label>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleAdd}
                    disabled={!text.trim() || createNote.isPending}
                  >
                    Add note
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {!notesEnabled && (
          <p className="text-[11px] text-muted-foreground">
            Read-only review.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
