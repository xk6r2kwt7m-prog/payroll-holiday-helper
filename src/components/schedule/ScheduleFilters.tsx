import { cn } from "@/lib/utils";
import { Filter, AlertTriangle, Eye, UserX, EyeOff } from "lucide-react";

export type QuickFilter = "all" | "gaps" | "unassigned" | "no_shifts" | "unpublished";

interface ScheduleFiltersProps {
  activeFilter: QuickFilter;
  onFilterChange: (filter: QuickFilter) => void;
  gapCount: number;
  unassignedCount: number;
  noShiftCount: number;
  unpublishedCount: number;
}

export function ScheduleFilters({
  activeFilter,
  onFilterChange,
  gapCount,
  unassignedCount,
  noShiftCount,
  unpublishedCount,
}: ScheduleFiltersProps) {
  const filters: { id: QuickFilter; label: string; icon: typeof Filter; count?: number; color?: string }[] = [
    { id: "all", label: "All", icon: Filter },
    ...(gapCount > 0 ? [{ id: "gaps" as QuickFilter, label: "Gaps", icon: AlertTriangle, count: gapCount, color: "text-destructive" }] : []),
    ...(unassignedCount > 0 ? [{ id: "unassigned" as QuickFilter, label: "Open", icon: Eye, count: unassignedCount, color: "text-warning" }] : []),
    ...(noShiftCount > 0 ? [{ id: "no_shifts" as QuickFilter, label: "No shifts", icon: UserX, count: noShiftCount }] : []),
    ...(unpublishedCount > 0 ? [{ id: "unpublished" as QuickFilter, label: "Unpublished", icon: EyeOff, count: unpublishedCount }] : []),
  ];

  if (filters.length <= 1) return null;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
      {filters.map((f) => {
        const Icon = f.icon;
        const isActive = activeFilter === f.id;
        return (
          <button
            key={f.id}
            onClick={() => onFilterChange(isActive && f.id !== "all" ? "all" : f.id)}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors min-h-[28px]",
              isActive
                ? "bg-foreground text-background"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            )}
          >
            <Icon className={cn("h-3 w-3", !isActive && f.color)} />
            {f.label}
            {f.count !== undefined && (
              <span className={cn(
                "text-[10px] font-bold",
                isActive ? "text-background/70" : f.color || "text-muted-foreground"
              )}>
                {f.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
