import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { MapPin } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface DraggableShiftCellProps {
  shift: any;
  isAdmin: boolean;
  isDragging?: boolean;
  onView?: (e: React.MouseEvent) => void;
  onCopy?: (e: React.MouseEvent) => void;
  onAdd?: (e: React.MouseEvent) => void;
}

export function DraggableShiftCell({ shift, isAdmin, onView }: DraggableShiftCellProps) {
  const isMobile = useIsMobile();

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: shift.id,
    data: { shift },
    disabled: !isAdmin || isMobile,
  });

  const style = transform
    ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
        zIndex: 50,
        opacity: isDragging ? 0.85 : 1,
      }
    : undefined;

  const isOpen = shift.status === "open";
  const isPublished = shift.is_published;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => { if (onView) { e.stopPropagation(); onView(e); } }}
      className={cn(
        "rounded text-[10px] sm:text-[11px] leading-tight relative select-none",
        "transition-all",
        "min-h-[38px] sm:min-h-[38px] flex flex-col items-center justify-center gap-0",
        "px-1 py-1 sm:px-1.5 sm:py-1",
        // Clean, calm states
        isOpen
          ? "bg-muted/30 text-muted-foreground border border-dashed border-border/50"
          : isPublished
            ? "bg-success/[0.04] border border-success/20"
            : "bg-primary/[0.03] border border-primary/15",
        isDragging && "shadow-lg ring-2 ring-primary/30 scale-105",
        isAdmin && !isMobile && "cursor-grab active:cursor-grabbing hover:shadow-sm hover:border-border/60",
        isAdmin && isMobile && "cursor-pointer active:scale-[0.97]",
      )}
      {...(isAdmin && !isMobile ? { ...listeners, ...attributes } : {})}
    >
      {/* Time — strongest element */}
      <div className="font-semibold tabular-nums whitespace-nowrap text-foreground text-[11px] sm:text-xs">
        {shift.start_time?.slice(0, 5)}
      </div>
      <div className="tabular-nums whitespace-nowrap text-[9px] text-muted-foreground">
        {shift.end_time?.slice(0, 5)}
      </div>

      {/* Published indicator — subtle dot */}
      {isPublished && (
        <div className="absolute top-[3px] right-[3px]">
          <span className="inline-block h-[4px] w-[4px] rounded-full bg-success/70" />
        </div>
      )}

      {/* Open shift dot */}
      {isOpen && (
        <div className="absolute top-[3px] right-[3px]">
          <span className="inline-block h-[4px] w-[4px] rounded-full bg-muted-foreground/40" />
        </div>
      )}
    </div>
  );
}

interface CrossBranchShiftCellProps {
  shift: any;
  onNavigate?: (branch: string) => void;
}

export function CrossBranchShiftCell({ shift, onNavigate }: CrossBranchShiftCellProps) {
  return (
    <div
      className={cn(
        "rounded px-1.5 py-1 text-[10px] leading-tight",
        "bg-muted/20 text-muted-foreground/70 border border-dashed border-border/40",
        "min-h-[38px] flex flex-col items-center justify-center gap-0",
        "transition-all active:scale-95",
        onNavigate && "cursor-pointer hover:bg-muted/30"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onNavigate?.(shift.branch);
      }}
      title={onNavigate ? `View at ${shift.branch}` : undefined}
    >
      <div className="font-semibold tabular-nums whitespace-nowrap">
        {shift.start_time?.slice(0, 5)}
      </div>
      <div className="flex items-center gap-0.5 text-[8px] opacity-60">
        <MapPin className="h-2 w-2" />
        <span>{shift.branch?.slice(0, 4)}</span>
      </div>
    </div>
  );
}
