import { useState } from "react";
import { History, X, ArrowRight, StickyNote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { useEmployeeAdjustments, type PayrollAdjustment } from "@/hooks/usePayrollAdjustments";
import { formatCurrency, formatHours } from "@/hooks/useHolidays";

interface AdjustmentHistoryDrawerProps {
  periodId: string;
  employeeId: string;
  employeeName: string;
  hasAdjustments: boolean;
}

const FIELD_LABELS: Record<string, string> = {
  timesheet_hours: "Timesheet Hours",
  hourly_rate: "Hourly Rate",
  service_charge: "Service Charge",
  performance_bonus: "Performance Bonus",
  special_bonus: "Special Bonus",
};

function formatFieldValue(field: string, value: number | null): string {
  if (value === null) return "—";
  if (field === "timesheet_hours") return formatHours(value);
  return formatCurrency(value);
}

export function AdjustmentHistoryDrawer({
  periodId,
  employeeId,
  employeeName,
  hasAdjustments,
}: AdjustmentHistoryDrawerProps) {
  const [open, setOpen] = useState(false);
  const { data: adjustments = [] } = useEmployeeAdjustments(
    open ? periodId : undefined,
    open ? employeeId : undefined
  );

  if (!hasAdjustments) return null;

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="inline-flex items-center gap-1 ml-1"
        title="View manual adjustments"
      >
        <Badge variant="outline" className="text-[10px] h-5 bg-warning/10 text-warning border-warning/30 hover:bg-warning/20 cursor-pointer">
          <History className="h-3 w-3 mr-0.5" />
          Adjusted
        </Badge>
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="flex items-center justify-between">
            <DrawerTitle className="text-base">
              Adjustment History — {employeeName}
            </DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </DrawerHeader>

          <div className="px-4 pb-6 space-y-3 overflow-y-auto">
            <p className="text-xs text-muted-foreground">
              Internal adjustments for this payroll period. These do not appear in exports or PDFs.
            </p>

            {adjustments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No adjustments recorded.</p>
            ) : (
              <div className="space-y-2">
                {adjustments.map((adj) => (
                  <div key={adj.id} className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">
                        {FIELD_LABELS[adj.field_name] || adj.field_name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(adj.created_at).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">
                        {formatFieldValue(adj.field_name, adj.old_value)}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium text-foreground">
                        {formatFieldValue(adj.field_name, adj.new_value)}
                      </span>
                      {adj.delta !== null && adj.delta !== 0 && (
                        <Badge variant="outline" className={`text-[10px] h-5 ${adj.delta > 0 ? "text-success" : "text-destructive"}`}>
                          {adj.delta > 0 ? "+" : ""}{adj.field_name === "timesheet_hours" ? formatHours(adj.delta) : formatCurrency(adj.delta)}
                        </Badge>
                      )}
                    </div>
                    {adj.note && (
                      <div className="flex items-start gap-1.5 mt-1">
                        <StickyNote className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                        <p className="text-xs text-muted-foreground italic">{adj.note}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
