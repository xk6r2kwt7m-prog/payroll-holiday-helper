import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Copy, Send, Filter, AlertTriangle, UserX } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileManagerBarProps {
  onBuildShift: () => void;
  onCopyDay?: () => void;
  onPublishDay?: () => void;
  gapCount: number;
  unscheduledCount: number;
  hasUnpublished: boolean;
  isPublishing: boolean;
  department: string;
}

export function MobileManagerBar({
  onBuildShift,
  onCopyDay,
  onPublishDay,
  gapCount,
  unscheduledCount,
  hasUnpublished,
  isPublishing,
  department,
}: MobileManagerBarProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-card border-b border-border overflow-x-auto no-scrollbar">
      {/* Primary CTA */}
      <Button
        size="sm"
        onClick={onBuildShift}
        className="h-9 gap-1.5 text-xs shrink-0 rounded-full px-4 shadow-sm"
        disabled={department === "All"}
      >
        <Plus className="h-3.5 w-3.5" />
        Build Shift
      </Button>

      {/* Quick publish */}
      {hasUnpublished && onPublishDay && (
        <Button
          variant="outline"
          size="sm"
          onClick={onPublishDay}
          disabled={isPublishing}
          className="h-9 gap-1.5 text-xs shrink-0 rounded-full px-3"
        >
          <Send className="h-3 w-3" />
          Publish
        </Button>
      )}

      {/* Gap indicator */}
      {gapCount > 0 && (
        <Badge
          variant="outline"
          className="h-7 gap-1 text-[10px] shrink-0 border-destructive/30 text-destructive bg-destructive/5"
        >
          <AlertTriangle className="h-3 w-3" />
          {gapCount} gap{gapCount !== 1 ? "s" : ""}
        </Badge>
      )}

      {/* Unscheduled staff */}
      {unscheduledCount > 0 && (
        <Badge
          variant="outline"
          className="h-7 gap-1 text-[10px] shrink-0 border-accent/30 text-accent bg-accent/5"
        >
          <UserX className="h-3 w-3" />
          {unscheduledCount} free
        </Badge>
      )}
    </div>
  );
}
