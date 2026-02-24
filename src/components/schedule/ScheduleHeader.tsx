import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  ChevronRight,
  Send,
  EyeOff,
  Copy,
  MoreHorizontal,
  ChevronDown,
  Printer,
  Download,
  Trash2,
  UserX,
  Clock,
  RefreshCw,
  Save,
  FolderOpen,
} from "lucide-react";
import { format, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";

type ViewMode = "week" | "day";

interface ScheduleHeaderProps {
  currentDate: Date;
  viewMode: ViewMode;
  weekStart: Date;
  weekEnd: Date;
  hasUnpublished: boolean;
  publishedCount: number;
  totalCount: number;
  isPublishing: boolean;
  onViewModeChange: (mode: ViewMode) => void;
  onNavigate: (dir: number) => void;
  onToday: () => void;
  onDateSelect: (date: Date) => void;
  onPublish: () => void;
  onUnpublish: () => void;
  isAdmin: boolean;
  // Copy dropdown actions
  onCopyPreviousWeek?: () => void;
  onCopyToNextWeek?: () => void;
  onSaveTemplate?: () => void;
  onLoadTemplate?: () => void;
  copyPending?: boolean;
  // More menu actions
  onDeleteAllShifts?: () => void;
  onClearAssignments?: () => void;
  onMarkAllEmpty?: () => void;
  onRemoveEmptyShifts?: () => void;
  shiftCount?: number;
  assignedCount?: number;
}

export function ScheduleHeader({
  currentDate,
  viewMode,
  weekStart,
  weekEnd,
  hasUnpublished,
  publishedCount,
  totalCount,
  isPublishing,
  onViewModeChange,
  onNavigate,
  onToday,
  onDateSelect,
  onPublish,
  onUnpublish,
  isAdmin,
  onCopyPreviousWeek,
  onCopyToNextWeek,
  onSaveTemplate,
  onLoadTemplate,
  copyPending,
  onDeleteAllShifts,
  onClearAssignments,
  onMarkAllEmpty,
  onRemoveEmptyShifts,
  shiftCount = 0,
  assignedCount = 0,
}: ScheduleHeaderProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      const week = startOfWeek(date, { weekStartsOn: 1 });
      onDateSelect(week);
      setCalendarOpen(false);
    }
  };

  const dateLabel =
    viewMode === "week"
      ? `${format(weekStart, "d MMM")} – ${format(weekEnd, "d MMM")}`
      : format(currentDate, "EEE d MMM yyyy");

  return (
    <div className="flex items-center gap-2 py-2 flex-wrap">
      {/* Left: Nav arrows + date picker */}
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onNavigate(-1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 font-semibold text-sm min-w-[160px]">
            {dateLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={currentDate}
            onSelect={handleCalendarSelect}
            initialFocus
            className="pointer-events-auto"
          />
          <div className="px-3 pb-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                onToday();
                setCalendarOpen(false);
              }}
            >
              Jump to Current Week
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onNavigate(1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* View mode selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            {viewMode === "week" ? "Week by Employee" : "Day"} 
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px]">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">View by Employee</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onViewModeChange("day")}>Day</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onViewModeChange("week")}>Week</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Action buttons — Deputy-style toolbar */}
      {isAdmin && (
        <div className="flex items-center gap-1.5">
          {/* Refresh */}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToday} title="Refresh">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>

          {/* Copy dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <Copy className="h-3.5 w-3.5" />
                Copy
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuItem onClick={onCopyPreviousWeek} disabled={copyPending}>
                Copy from previous week
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCopyToNextWeek} disabled={copyPending}>
                Copy to next week
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSaveTemplate} disabled={shiftCount === 0}>
                <Save className="h-3.5 w-3.5 mr-2" />
                Save as Template
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onLoadTemplate}>
                <FolderOpen className="h-3.5 w-3.5 mr-2" />
                Load Template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* More menu ⋯ */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[220px]">
              <DropdownMenuItem className="gap-2">
                <Printer className="h-3.5 w-3.5" />
                Print schedule
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2">
                <Download className="h-3.5 w-3.5" />
                Export schedule
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Options</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={onMarkAllEmpty}
                disabled={assignedCount === 0}
                className="gap-2"
              >
                <UserX className="h-3.5 w-3.5" />
                Mark all shifts empty
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onRemoveEmptyShifts}
                disabled={shiftCount === 0}
                className="gap-2"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove empty shifts
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDeleteAllShifts}
                disabled={shiftCount === 0}
                className="gap-2 text-destructive focus:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete all shifts
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2">
                <Clock className="h-3.5 w-3.5" />
                Bulk update times
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Publish status button */}
          {hasUnpublished ? (
            <Button
              size="sm"
              onClick={onPublish}
              disabled={isPublishing}
              className="h-8 gap-1.5 text-xs"
            >
              <Send className="h-3.5 w-3.5" />
              {isPublishing ? "Publishing..." : "Publish & Notify"}
            </Button>
          ) : publishedCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onUnpublish}
              className="h-8 gap-1.5 text-xs text-success border-success/30 hover:bg-success/5"
            >
              All shifts published
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
