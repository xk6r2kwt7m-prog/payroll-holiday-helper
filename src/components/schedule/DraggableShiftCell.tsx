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
        "rounded-md text-[10px] sm:text-[11px] leading-tight relative select-none",
        "transition-all duration-150",
        "min-h-[38px] sm:min-h-[38px] flex flex-col items-center justify-center gap-0.5",
        "px-1.5 py-1 sm:px-2 sm:py-1.5",
        // Three clear visual states
        isOpen
          ? "bg-muted/30 text-muted-foreground border border-dashed border-border/50"
          : isPublished
            ? "bg-card border border-border/50 shadow-sm"
            : "bg-accent/40 border border-accent-foreground/10",
        isDragging && "shadow-lg ring-2 ring-primary/30 scale-105",
        isAdmin && !isMobile && "cursor-grab active:cursor-grabbing hover:shadow-md hover:border-border/80",
        isAdmin && isMobile && "cursor-pointer active:scale-[0.97]",
      )}
      {...(isAdmin && !isMobile ? { ...listeners, ...attributes } : {})}
    >
      {/* Start time — primary */}
      <div className="font-semibold tabular-nums whitespace-nowrap text-foreground text-[11px] sm:text-xs tracking-tight">
        {shift.start_time?.slice(0, 5)}
      </div>
      {/* End time — secondary */}
      <div className="tabular-nums whitespace-nowrap text-[9px] text-muted-foreground/60">
        {shift.end_time?.slice(0, 5)}
      </div>

      {/* Published dot */}
      {isPublished && !isOpen && (
        <div className="absolute top-[3px] right-[3px]">
          <span className="inline-block h-[5px] w-[5px] rounded-full bg-success/70" />
        </div>
      )}

      {/* Open shift dot */}
      {isOpen && (
        <div className="absolute top-[3px] right-[3px]">
          <span className="inline-block h-[5px] w-[5px] rounded-full bg-muted-foreground/25" />
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
        "rounded-md px-1.5 py-1.5 text-[10px] leading-tight",
        "bg-muted/15 text-muted-foreground/50 border border-dashed border-border/30",
        "min-h-[38px] flex flex-col items-center justify-center gap-0.5",
        "transition-all active:scale-95",
        onNavigate && "cursor-pointer hover:bg-muted/25"
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
      <div className="flex items-center gap-0.5 text-[8px] opacity-40">
        <MapPin className="h-2 w-2" />
        <span>{shift.branch?.slice(0, 4)}</span>
      </div>
    </div>
  );
}
