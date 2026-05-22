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
  Wand2,
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
  weekStateLabel?: string;
  weekStateTone?: "neutral" | "info" | "success" | "warning" | "danger";
  onAutoFillGaps?: () => void;
  hasUnassigned?: boolean;
  rotaIssuesSlot?: React.ReactNode;
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
  weekStateLabel,
  weekStateTone = "neutral",
  onAutoFillGaps,
  hasUnassigned,
  rotaIssuesSlot,
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
    <div className="space-y-1.5 pb-1">
      {/* Primary control row */}
      <div className="flex items-center gap-1.5 h-10">
        {/* Location selector */}
        <Select value={selectedBranch} onValueChange={onBranchChange}>
          <SelectTrigger className={cn(
            "h-8 w-auto gap-1.5 text-xs font-medium border-none bg-transparent shadow-none px-2",
            isMobile ? "min-w-[70px]" : "min-w-[100px]"
          )}>
            <MapPin className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {branches.map((b) => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="h-4 w-px bg-border/60" />

        {/* Week navigation — centred */}
        <div className="flex items-center gap-0 flex-1 justify-center min-w-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground" onClick={() => onNavigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 font-semibold text-[13px] px-3 min-w-0 text-foreground tracking-tight"
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

          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground" onClick={() => onNavigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Week state pill */}
        {weekStateLabel && (
          <span
            data-testid="week-state-pill"
            data-week-state-tone={weekStateTone}
            className={cn(
              "hidden sm:inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0",
              weekStateTone === "success" && "bg-success/10 text-success",
              weekStateTone === "warning" && "bg-amber-100 text-amber-700",
              weekStateTone === "danger" && "bg-destructive/10 text-destructive",
              weekStateTone === "info" && "bg-primary/10 text-primary",
              weekStateTone === "neutral" && "bg-muted text-muted-foreground"
            )}
          >
            {weekStateLabel}
          </span>
        )}

        {/* Rota issues badge slot (tappable warnings panel) */}
        {rotaIssuesSlot}

        {/* Load Template — primary alongside Build Shift */}
        {isAdmin && onLoadTemplate && (
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadTemplate}
            data-testid="load-template-button"
            className="h-7 gap-1.5 text-[11px] shrink-0 rounded-full px-3"
          >
            <FolderOpen className="h-3 w-3" />
            Load Template
          </Button>
        )}

        {/* Publish / Undo */}
        {isAdmin && (
          <div className="flex items-center gap-1.5 shrink-0">
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
                className="h-7 gap-1.5 text-[11px] shrink-0 rounded-full px-3.5 shadow-sm"
              >
                <Send className="h-3 w-3" />
                {isPublishing ? "Publishing…" : "Publish"}
              </Button>
            ) : publishedCount > 0 && !canUndoPublish ? (
              <span className="text-[11px] text-success font-medium px-2 flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                Live
              </span>
            ) : null}
          </div>
        )}

        {/* Overflow menu */}
        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[220px]">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">View</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onViewModeChange("week")} className="gap-2 text-[13px]">
                Week view {viewMode === "week" && <span className="ml-auto text-primary text-xs">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewModeChange("day")} className="gap-2 text-[13px]">
                Day view {viewMode === "day" && <span className="ml-auto text-primary text-xs">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">Templates</DropdownMenuLabel>
              <DropdownMenuItem onClick={onCopyPreviousWeek} disabled={copyPending} className="gap-2 text-[13px]">
                <Copy className="h-3.5 w-3.5" />
                Copy previous week
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSaveTemplate} disabled={shiftCount === 0} className="gap-2 text-[13px]">
                <Save className="h-3.5 w-3.5" />
                Save as template
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onLoadTemplate} className="gap-2 text-[13px]">
                <FolderOpen className="h-3.5 w-3.5" />
                Load template
              </DropdownMenuItem>
              {onAutoFillGaps && (
                <DropdownMenuItem
                  onClick={onAutoFillGaps}
                  disabled={!hasUnassigned}
                  data-testid="auto-fill-gaps-menu"
                  className="gap-2 text-[13px]"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  Auto-fill gaps
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">Bulk Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={onMarkAllEmpty} disabled={assignedCount === 0} className="gap-2 text-[13px]">
                <UserX className="h-3.5 w-3.5" />
                Clear assignments
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRemoveEmptyShifts} disabled={shiftCount === 0} className="gap-2 text-[13px]">
                <Trash2 className="h-3.5 w-3.5" />
                Remove empty shifts
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDeleteAllShifts}
                disabled={shiftCount === 0}
                className="gap-2 text-[13px] text-destructive focus:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete all shifts
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/schedule/labour-cost")} className="gap-2 text-[13px]">
                <DollarSign className="h-3.5 w-3.5" />
                Labour cost preview
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-[13px]">
                <Printer className="h-3.5 w-3.5" />
                Print schedule
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-[13px]">
                <Download className="h-3.5 w-3.5" />
                Export schedule
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Department pills */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
        {departments.map((d) => (
          <button
            key={d}
            onClick={() => onDeptChange(d)}
            className={cn(
              "rounded-full text-[11px] font-medium whitespace-nowrap transition-all px-3 py-1 min-h-[26px]",
              selectedDept === d
                ? "bg-foreground text-background shadow-sm"
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
