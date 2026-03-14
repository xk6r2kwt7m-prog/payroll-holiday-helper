import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Send,
  Copy,
  MoreHorizontal,
  Printer,
  Download,
  Trash2,
  UserX,
  Save,
  FolderOpen,
  MapPin,
  DollarSign,
  Undo2,
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
  branches: readonly string[];
  selectedBranch: string;
  onBranchChange: (b: string) => void;
  departments: readonly string[];
  selectedDept: string;
  onDeptChange: (d: string) => void;
  onCopyPreviousWeek?: () => void;
  onCopyToNextWeek?: () => void;
  onSaveTemplate?: () => void;
  onLoadTemplate?: () => void;
  copyPending?: boolean;
  onDeleteAllShifts?: () => void;
  onClearAssignments?: () => void;
  onMarkAllEmpty?: () => void;
  onRemoveEmptyShifts?: () => void;
  shiftCount?: number;
  assignedCount?: number;
  canUndoPublish?: boolean;
  undoTimeRemaining?: string;
  onUndoPublish?: () => void;
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
  branches,
  selectedBranch,
  onBranchChange,
  departments,
  selectedDept,
  onDeptChange,
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
  canUndoPublish,
  undoTimeRemaining,
  onUndoPublish,
}: ScheduleHeaderProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

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
      : format(currentDate, "EEE d MMM");

  return (
    <div className="space-y-0 pb-0">
      {/* Single control row */}
      <div className="flex items-center gap-1.5 h-11">
        {/* Location */}
        <Select value={selectedBranch} onValueChange={onBranchChange}>
          <SelectTrigger className={cn(
            "h-8 w-auto gap-1 text-xs font-medium border-none bg-transparent shadow-none px-1.5",
            isMobile ? "min-w-[70px]" : "min-w-[100px]"
          )}>
            <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {branches.map((b) => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Thin divider */}
        <div className="h-3.5 w-px bg-border/50" />

        {/* Week navigation */}
        <div className="flex items-center gap-0 flex-1 justify-center min-w-0">
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => onNavigate(-1)}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>

          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 font-medium text-xs px-2 min-w-0"
              >
                <span className="truncate">{dateLabel}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={currentDate}
                onSelect={handleCalendarSelect}
                initialFocus
                className="p-3 pointer-events-auto"
              />
              <div className="px-3 pb-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => { onToday(); setCalendarOpen(false); }}
                >
                  Today
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => onNavigate(1)}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Publish CTA + Undo */}
        {isAdmin && (
          <div className="flex items-center gap-1 shrink-0">
            {canUndoPublish && onUndoPublish ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onUndoPublish}
                className="h-7 gap-1 text-[11px] rounded-full px-2.5 border-warning/30 text-warning hover:bg-warning/5"
              >
                <Undo2 className="h-3 w-3" />
                Undo ({undoTimeRemaining})
              </Button>
            ) : null}

            {hasUnpublished ? (
              <Button
                size="sm"
                onClick={onPublish}
                disabled={isPublishing}
                className="h-7 gap-1 text-[11px] shrink-0 rounded-full px-3"
              >
                <Send className="h-3 w-3" />
                {isPublishing ? "Publishing…" : "Publish"}
              </Button>
            ) : publishedCount > 0 && !canUndoPublish ? (
              <span className="text-[11px] text-success font-medium px-2">✓ Live</span>
            ) : null}
          </div>
        )}

        {/* Overflow menu */}
        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[210px]">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">View</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onViewModeChange("week")}>
                Week view {viewMode === "week" && "✓"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewModeChange("day")}>
                Day view {viewMode === "day" && "✓"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Templates</DropdownMenuLabel>
              <DropdownMenuItem onClick={onCopyPreviousWeek} disabled={copyPending}>
                <Copy className="h-3.5 w-3.5 mr-2" />
                Copy previous week
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSaveTemplate} disabled={shiftCount === 0}>
                <Save className="h-3.5 w-3.5 mr-2" />
                Save as template
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onLoadTemplate}>
                <FolderOpen className="h-3.5 w-3.5 mr-2" />
                Load template
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Bulk</DropdownMenuLabel>
              <DropdownMenuItem onClick={onMarkAllEmpty} disabled={assignedCount === 0} className="gap-2">
                <UserX className="h-3.5 w-3.5" />
                Clear assignments
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRemoveEmptyShifts} disabled={shiftCount === 0} className="gap-2">
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
              <DropdownMenuItem onClick={() => navigate("/schedule/labour-cost")} className="gap-2">
                <DollarSign className="h-3.5 w-3.5" />
                Labour cost preview
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2">
                <Printer className="h-3.5 w-3.5" />
                Print schedule
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2">
                <Download className="h-3.5 w-3.5" />
                Export schedule
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Department pills — second row */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1.5">
        {departments.map((d) => (
          <button
            key={d}
            onClick={() => onDeptChange(d)}
            className={cn(
              "rounded-full text-[11px] font-medium whitespace-nowrap transition-colors px-2.5 py-0.5 min-h-[26px]",
              selectedDept === d
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}
