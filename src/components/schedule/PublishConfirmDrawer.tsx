import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Send, AlertTriangle, Check, Users, Bell, X, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { PublishBlocker, PublishWarning } from "@/lib/schedule-publish-gate";

interface PublishConfirmDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch: string;
  weekStart: Date;
  weekEnd: Date;
  unpublishedCount: number;
  totalShifts: number;
  understaffedDays: number;
  complianceWarnings: number;
  isPublishing: boolean;
  onConfirmPublish: () => void;
  // Phase 3 — richer publish summary + hard-blocker gate
  assignedShifts?: number;
  unassignedShifts?: number;
  affectedEmployeeCount?: number;
  affectedDepartments?: string[];
  blockers?: PublishBlocker[];
  warnings?: PublishWarning[];
}

export function PublishConfirmDrawer({
  open,
  onOpenChange,
  branch,
  weekStart,
  weekEnd,
  unpublishedCount,
  totalShifts,
  understaffedDays,
  complianceWarnings,
  isPublishing,
  onConfirmPublish,
  assignedShifts,
  unassignedShifts,
  affectedEmployeeCount,
  affectedDepartments,
  blockers = [],
  warnings = [],
}: PublishConfirmDrawerProps) {
  const hasBlockers = blockers.length > 0;
  const softWarningCount = warnings.length + understaffedDays + complianceWarnings;
  const hasWarnings = softWarningCount > 0;
  const isReady = !hasBlockers && !hasWarnings;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent data-testid="publish-confirm-drawer">
        <DrawerHeader>
          <DrawerTitle className="text-left">Publish Rota</DrawerTitle>
          <DrawerDescription className="text-left">
            {branch} · {format(weekStart, "d MMM")} – {format(weekEnd, "d MMM")}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {/* Status banner */}
          <div className={cn(
            "rounded-xl p-4 border",
            hasBlockers
              ? "border-destructive/30 bg-destructive/5"
              : isReady
              ? "border-success/30 bg-success/5"
              : "border-warning/30 bg-warning/5"
          )}>
            <div className="flex items-center gap-2 mb-2">
              {hasBlockers ? (
                <X className="h-5 w-5 text-destructive" />
              ) : isReady ? (
                <Check className="h-5 w-5 text-success" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-warning" />
              )}
              <span className="font-semibold text-sm">
                {hasBlockers
                  ? "Cannot publish — fix blockers first"
                  : isReady
                  ? "Ready to publish"
                  : "Publish with warnings"}
              </span>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span>
                  {unpublishedCount} draft shift{unpublishedCount !== 1 ? "s" : ""} of {totalShifts} total
                  {typeof assignedShifts === "number" && (
                    <> · {assignedShifts} assigned, {unassignedShifts ?? 0} unassigned</>
                  )}
                </span>
              </div>
              {typeof affectedEmployeeCount === "number" && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span>{affectedEmployeeCount} staff affected</span>
                </div>
              )}
              {affectedDepartments && affectedDepartments.length > 0 && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>Departments: {affectedDepartments.join(", ")}</span>
                </div>
              )}
            </div>
          </div>

          {/* Hard blockers */}
          {hasBlockers && (
            <div
              data-testid="publish-blockers"
              className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 space-y-1.5"
            >
              <div className="text-xs font-semibold text-destructive uppercase tracking-wide">
                Blockers ({blockers.length})
              </div>
              <ul className="space-y-1 text-sm">
                {blockers.slice(0, 8).map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <X className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                    <span>{b.message}</span>
                  </li>
                ))}
                {blockers.length > 8 && (
                  <li className="text-xs text-muted-foreground italic">
                    +{blockers.length - 8} more
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Soft warnings */}
          {warnings.length > 0 && (
            <div
              data-testid="publish-warnings"
              className="rounded-xl border border-warning/30 bg-warning/5 p-3 space-y-1.5"
            >
              <div className="text-xs font-semibold text-warning uppercase tracking-wide">
                Warnings ({warnings.length})
              </div>
              <ul className="space-y-1 text-sm">
                {warnings.slice(0, 6).map((w, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                    <span>{w.message}</span>
                  </li>
                ))}
                {warnings.length > 6 && (
                  <li className="text-xs text-muted-foreground italic">
                    +{warnings.length - 6} more
                  </li>
                )}
              </ul>
            </div>
          )}

          {understaffedDays > 0 && (
            <div className="flex items-center gap-2 text-sm text-warning">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{understaffedDays} day{understaffedDays !== 1 ? "s" : ""} understaffed</span>
            </div>
          )}

          {/* Notification note */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
            <Bell className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>Staff will be notified when the rota is published. They'll see their shifts in the staff portal.</span>
          </div>
        </div>

        <DrawerFooter>
          <Button
            onClick={() => { onConfirmPublish(); onOpenChange(false); }}
            disabled={isPublishing || hasBlockers}
            data-testid="publish-confirm-button"
            className="w-full h-12 gap-2"
          >
            <Send className="h-4 w-4" />
            {isPublishing
              ? "Publishing…"
              : hasBlockers
              ? "Fix blockers to publish"
              : hasWarnings
              ? "Publish Anyway"
              : "Publish & Notify Staff"}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
