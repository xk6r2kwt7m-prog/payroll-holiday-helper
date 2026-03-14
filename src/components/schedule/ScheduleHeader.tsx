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
  Clock,
  Save,
  FolderOpen,
  MapPin,
  CalendarDays,
  DollarSign,
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
  // Branch
  branches: readonly string[];
  selectedBranch: string;
  onBranchChange: (b: string) => void;
  // Department
  departments: readonly string[];
  selectedDept: string;
  onDeptChange: (d: string) => void;
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
    <div className={cn("space-y-2", isMobile ? "pb-1.5" : "pb-2")}>
      {/* Row 1: Location + Date Nav — always visible */}
      <div className="flex items-center gap-2">
        {/* Location selector */}
        <Select value={selectedBranch} onValueChange={onBranchChange}>
          <SelectTrigger className={cn(
            "h-10 w-auto gap-1.5 text-sm font-semibold border-border",
            isMobile ? "min-w-[100px]" : "min-w-[130px]"
          )}>
            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {branches.map((b) => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date navigation */}
        <div className="flex items-center gap-0.5 flex-1 justify-center min-w-0">
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => onNavigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 font-semibold text-sm px-2 min-w-0"
              >
                <CalendarDays className="h-3.5 w-3.5 mr-1.5 shrink-0 text-muted-foreground" />
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
                  Jump to Today
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => onNavigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Overflow menu — secondary actions */}
        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[220px]">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">View</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onViewModeChange("week")}>
                Week view {viewMode === "week" && "✓"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewModeChange("day")}>
                Day view {viewMode === "day" && "✓"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Copy & Templates</DropdownMenuLabel>
              <DropdownMenuItem onClick={onCopyPreviousWeek} disabled={copyPending}>
                <Copy className="h-3.5 w-3.5 mr-2" />
                Copy from previous week
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCopyToNextWeek} disabled={copyPending}>
                <Copy className="h-3.5 w-3.5 mr-2" />
                Copy to next week
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSaveTemplate} disabled={shiftCount === 0}>
                <Save className="h-3.5 w-3.5 mr-2" />
                Save as Template
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onLoadTemplate}>
                <FolderOpen className="h-3.5 w-3.5 mr-2" />
                Load Template
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Bulk Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={onMarkAllEmpty} disabled={assignedCount === 0} className="gap-2">
                <UserX className="h-3.5 w-3.5" />
                Clear all assignments
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
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Analysis</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigate("/schedule/labour-cost")} className="gap-2">
                <DollarSign className="h-3.5 w-3.5" />
                Preview labour cost
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

      {/* Row 2: Department filter pills + Publish CTA */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1">
          {departments.map((d) => (
            <button
              key={d}
              onClick={() => onDeptChange(d)}
              className={cn(
                "rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                // Mobile: taller touch target
                isMobile ? "px-3 py-2 min-h-[36px]" : "px-3 py-1.5 min-h-[32px]",
                selectedDept === d
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Publish CTA — always visible */}
        {isAdmin && (
          <>
            {hasUnpublished ? (
              <Button
                size="sm"
                onClick={onPublish}
                disabled={isPublishing}
                className="h-8 gap-1.5 text-xs shrink-0 rounded-full px-4"
              >
                <Send className="h-3.5 w-3.5" />
                {isPublishing ? "Publishing…" : "Publish"}
              </Button>
            ) : publishedCount > 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onUnpublish}
                className="h-8 text-xs text-success border-success/30 hover:bg-success/5 shrink-0 rounded-full px-3"
              >
                ✓ Published
              </Button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
