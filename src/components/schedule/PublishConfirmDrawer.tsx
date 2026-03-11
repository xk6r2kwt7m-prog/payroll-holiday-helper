import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Send, AlertTriangle, Check, Users, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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
}: PublishConfirmDrawerProps) {
  const hasWarnings = understaffedDays > 0 || complianceWarnings > 0;
  const isReady = !hasWarnings;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-left">Publish Rota</DrawerTitle>
          <DrawerDescription className="text-left">
            {branch} · {format(weekStart, "d MMM")} – {format(weekEnd, "d MMM")}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-3">
          {/* Status */}
          <div className={cn(
            "rounded-xl p-4 border",
            isReady
              ? "border-success/30 bg-success/5"
              : "border-warning/30 bg-warning/5"
          )}>
            <div className="flex items-center gap-2 mb-2">
              {isReady ? (
                <Check className="h-5 w-5 text-success" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-warning" />
              )}
              <span className="font-semibold text-sm">
                {isReady ? "Ready to publish" : "Publish with warnings"}
              </span>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{unpublishedCount} unpublished shifts of {totalShifts} total</span>
              </div>
              {understaffedDays > 0 && (
                <div className="flex items-center gap-2 text-warning">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>{understaffedDays} day{understaffedDays !== 1 ? "s" : ""} understaffed</span>
                </div>
              )}
              {complianceWarnings > 0 && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>{complianceWarnings} compliance warning{complianceWarnings !== 1 ? "s" : ""}</span>
                </div>
              )}
            </div>
          </div>

          {/* Notification note */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
            <Bell className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>Staff will be notified when the rota is published. They'll see their shifts in the staff portal.</span>
          </div>
        </div>

        <DrawerFooter>
          <Button
            onClick={() => { onConfirmPublish(); onOpenChange(false); }}
            disabled={isPublishing}
            className="w-full h-12 gap-2"
          >
            <Send className="h-4 w-4" />
            {isPublishing ? "Publishing…" : hasWarnings ? "Publish Anyway" : "Publish & Notify Staff"}
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
