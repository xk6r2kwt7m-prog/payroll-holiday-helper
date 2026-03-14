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
        "transition-all",
        "min-h-[40px] sm:min-h-[40px] flex flex-col items-center justify-center gap-0",
        "px-1 py-1.5 sm:px-1.5 sm:py-1.5",
        // Calmer colour system: published = subtle green left border, draft = subtle border, open = dashed
        isOpen
          ? "bg-muted/40 text-muted-foreground border border-dashed border-border"
          : isPublished
            ? "bg-card border border-border/60 border-l-2 border-l-success"
            : "bg-card border border-border/60 border-l-2 border-l-primary/60",
        isDragging && "shadow-lg ring-2 ring-primary/40 scale-105 opacity-90",
        isAdmin && !isMobile && "cursor-grab active:cursor-grabbing hover:shadow-sm",
        isAdmin && isMobile && "cursor-pointer active:scale-[0.97]",
      )}
      {...(isAdmin && !isMobile ? { ...listeners, ...attributes } : {})}
    >
      {/* Time — strongest visual element */}
      <div className="font-semibold tabular-nums whitespace-nowrap text-foreground">
        {shift.start_time?.slice(0, 5)}
      </div>
      <div className="font-medium tabular-nums whitespace-nowrap text-[9px] text-muted-foreground">
        {shift.end_time?.slice(0, 5)}
      </div>

      {/* Published dot — tiny, top-right, only when published */}
      {isPublished && (
        <div className="absolute top-[3px] right-[3px]">
          <span className="inline-block h-[5px] w-[5px] rounded-full bg-success" />
        </div>
      )}

      {/* Open shift indicator */}
      {isOpen && (
        <div className="absolute top-[3px] right-[3px]">
          <div className="h-[5px] w-[5px] rounded-full bg-accent" />
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
        "bg-muted/30 text-muted-foreground border border-dashed border-border/60",
        "min-h-[40px] flex flex-col items-center justify-center gap-0",
        "transition-all active:scale-95",
        onNavigate && "cursor-pointer hover:bg-muted/50"
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
      <div className="flex items-center gap-0.5 text-[8px] opacity-70">
        <MapPin className="h-2 w-2" />
        <span>{shift.branch?.slice(0, 4)}</span>
      </div>
    </div>
  );
}
