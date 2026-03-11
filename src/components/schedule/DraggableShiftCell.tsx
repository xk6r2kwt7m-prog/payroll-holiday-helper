import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { Lock, MapPin } from "lucide-react";

interface DraggableShiftCellProps {
  shift: any;
  isAdmin: boolean;
  isDragging?: boolean;
  onView?: (e: React.MouseEvent) => void;
  onCopy?: (e: React.MouseEvent) => void;
  onAdd?: (e: React.MouseEvent) => void;
}

export function DraggableShiftCell({ shift, isAdmin, onView }: DraggableShiftCellProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: shift.id,
    data: { shift },
    disabled: !isAdmin,
  });

  const style = transform
    ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
        zIndex: 50,
        opacity: isDragging ? 0.85 : 1,
      }
    : undefined;

  // Compute hours for the pill subtitle
  const [sh, sm] = (shift.start_time || "00:00").split(":").map(Number);
  const [eh, em] = (shift.end_time || "00:00").split(":").map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  const hours = mins / 60;

  const isOpen = shift.status === "open";
  const isPublished = shift.is_published;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => { if (onView) { e.stopPropagation(); onView(e); } }}
      className={cn(
        "rounded-lg px-1.5 py-1.5 text-[10px] sm:text-[11px] leading-tight relative select-none",
        "min-h-[36px] sm:min-h-[40px] flex flex-col items-center justify-center gap-0.5",
        "transition-all active:scale-95",
        // Status-based styling
        isOpen
          ? "bg-accent/10 text-accent border border-dashed border-accent/30"
          : isPublished
            ? "bg-success/12 text-success border border-success/25"
            : "bg-primary/8 text-primary border border-primary/20",
        isDragging && "shadow-lg ring-2 ring-primary/40 scale-105 opacity-90",
        isAdmin && "cursor-grab active:cursor-grabbing"
      )}
      {...(isAdmin ? { ...listeners, ...attributes } : {})}
    >
      {/* Time — primary info */}
      <div className="font-semibold tabular-nums whitespace-nowrap">
        {shift.start_time?.slice(0, 5)}
      </div>
      <div className="font-medium tabular-nums whitespace-nowrap text-[9px] opacity-70">
        {shift.end_time?.slice(0, 5)}
      </div>

      {/* Published indicator — subtle dot instead of lock icon */}
      {isPublished && (
        <div className="absolute top-0.5 right-0.5">
          <div className="h-1.5 w-1.5 rounded-full bg-success" title="Published" />
        </div>
      )}

      {/* Open shift indicator */}
      {isOpen && (
        <div className="absolute top-0.5 right-0.5">
          <div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" title="Open shift" />
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
        "rounded-lg px-1.5 py-1.5 text-[10px] leading-tight",
        "bg-warning/8 text-warning/80 border border-warning/20",
        "min-h-[36px] flex flex-col items-center justify-center gap-0.5",
        "transition-all active:scale-95",
        onNavigate && "cursor-pointer"
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
