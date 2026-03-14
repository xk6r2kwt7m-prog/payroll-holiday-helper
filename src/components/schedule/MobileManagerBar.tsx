import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Send, AlertTriangle, UserX, MoreVertical, Copy, FolderOpen, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileManagerBarProps {
  onBuildShift: () => void;
  onCopyDay?: () => void;
  onPublishDay?: () => void;
  onCopyPreviousWeek?: () => void;
  onLoadTemplate?: () => void;
  onFindCover?: () => void;
  gapCount: number;
  unscheduledCount: number;
  hasUnpublished: boolean;
  isPublishing: boolean;
  department: string;
  shiftCount?: number;
}

export function MobileManagerBar({
  onBuildShift,
  onPublishDay,
  onCopyPreviousWeek,
  onLoadTemplate,
  onFindCover,
  gapCount,
  unscheduledCount,
  hasUnpublished,
  isPublishing,
  department,
  shiftCount = 0,
}: MobileManagerBarProps) {
  const hasSecondaryActions = onCopyPreviousWeek || onLoadTemplate;

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 bg-card border-b border-border overflow-x-auto no-scrollbar">
      {/* Primary CTA — large thumb target */}
      <Button
        size="sm"
        onClick={onBuildShift}
        className="h-11 gap-1.5 text-sm shrink-0 rounded-full px-5 shadow-sm font-semibold"
        disabled={department === "All"}
      >
        <Plus className="h-4 w-4" />
        Build Shift
      </Button>

      {/* Quick publish */}
      {hasUnpublished && onPublishDay && (
        <Button
          variant="outline"
          size="sm"
          onClick={onPublishDay}
          disabled={isPublishing}
          className="h-11 gap-1.5 text-sm shrink-0 rounded-full px-4"
        >
          <Send className="h-3.5 w-3.5" />
          Publish
        </Button>
      )}

      {/* Quick actions overflow — Copy / Template / Find Cover */}
      {hasSecondaryActions && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0 rounded-full">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[200px]">
            {onCopyPreviousWeek && (
              <DropdownMenuItem onClick={onCopyPreviousWeek} className="gap-2 py-3">
                <Copy className="h-4 w-4" />
                Copy Last Week
              </DropdownMenuItem>
            )}
            {onLoadTemplate && (
              <DropdownMenuItem onClick={onLoadTemplate} className="gap-2 py-3">
                <FolderOpen className="h-4 w-4" />
                Load Template
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Spacer pushes badges right */}
      <div className="flex-1" />

      {/* Gap indicator */}
      {gapCount > 0 && (
        <Badge
          variant="outline"
          className="h-8 gap-1 text-xs shrink-0 border-destructive/30 text-destructive bg-destructive/5 px-2.5"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          {gapCount}
        </Badge>
      )}

      {/* Unscheduled staff */}
      {unscheduledCount > 0 && (
        <Badge
          variant="outline"
          className="h-8 gap-1 text-xs shrink-0 border-accent/30 text-accent bg-accent/5 px-2.5"
        >
          <UserX className="h-3.5 w-3.5" />
          {unscheduledCount}
        </Badge>
      )}
    </div>
  );
}
