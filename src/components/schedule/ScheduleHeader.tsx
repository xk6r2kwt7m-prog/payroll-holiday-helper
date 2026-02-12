import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Send, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";
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
  onPublish: () => void;
  onUnpublish: () => void;
  isAdmin: boolean;
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
  onPublish,
  onUnpublish,
  isAdmin,
}: ScheduleHeaderProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Schedule</h1>
          {isAdmin && totalCount > 0 && (
            <Badge
              variant={hasUnpublished ? "outline" : "secondary"}
              className={cn(
                "text-[10px]",
                hasUnpublished
                  ? "border-amber-500/40 text-amber-600 bg-amber-50 dark:bg-amber-950/20"
                  : "border-success/40 text-success bg-success/5"
              )}
            >
              {hasUnpublished
                ? `${totalCount - publishedCount} unpublished`
                : "All published"}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => onViewModeChange("day")}
              className={cn(
                "px-3 py-1.5 text-sm font-medium transition-colors",
                viewMode === "day"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground"
              )}
            >
              Day
            </button>
            <button
              onClick={() => onViewModeChange("week")}
              className={cn(
                "px-3 py-1.5 text-sm font-medium transition-colors",
                viewMode === "week"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground"
              )}
            >
              Week
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={onToday}>
            Today
          </Button>
          {isAdmin && hasUnpublished && (
            <Button
              size="sm"
              onClick={onPublish}
              disabled={isPublishing}
              className="gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              {isPublishing ? "Publishing..." : "Publish & Notify"}
            </Button>
          )}
          {isAdmin && publishedCount > 0 && !hasUnpublished && (
            <Button
              variant="outline"
              size="sm"
              onClick={onUnpublish}
              className="gap-1.5 text-muted-foreground"
            >
              <EyeOff className="h-3.5 w-3.5" />
              Unpublish
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => onNavigate(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold min-w-[220px] text-center">
          {viewMode === "week"
            ? `${format(weekStart, "d MMM")} – ${format(weekEnd, "d MMM yyyy")}`
            : format(currentDate, "EEE d MMM yyyy")}
        </h2>
        <Button variant="ghost" size="icon" onClick={() => onNavigate(1)}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
