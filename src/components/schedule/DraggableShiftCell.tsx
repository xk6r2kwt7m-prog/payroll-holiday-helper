import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { Lock, MapPin, GripVertical, Eye, Copy, Plus } from "lucide-react";

interface DraggableShiftCellProps {
  shift: any;
  isAdmin: boolean;
  isDragging?: boolean;
  onView?: (e: React.MouseEvent) => void;
  onCopy?: (e: React.MouseEvent) => void;
  onAdd?: (e: React.MouseEvent) => void;
}

export function DraggableShiftCell({ shift, isAdmin, onView, onCopy, onAdd }: DraggableShiftCellProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-md px-1.5 py-1 text-[11px] leading-tight relative group",
        shift.status === "open"
          ? "bg-accent/15 text-accent border border-accent/20"
          : shift.is_published
            ? "bg-success/15 text-success border border-success/30"
            : "bg-success/10 text-success border border-success/20",
        isDragging && "shadow-lg ring-2 ring-primary/40 scale-105",
        isAdmin && "cursor-grab active:cursor-grabbing"
      )}
      {...(isAdmin ? { ...listeners, ...attributes } : {})}
    >
      {/* Drag handle */}
      {isAdmin && (
        <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-60 transition-opacity">
          <GripVertical className="h-3 w-3" />
        </div>
      )}

      {/* Hover action buttons — Deputy style */}
      {isAdmin && (
        <div className="absolute -top-5 left-0 right-0 flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none group-hover:pointer-events-auto">
          {onView && (
            <button
              onClick={(e) => { e.stopPropagation(); onView(e); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="px-1.5 py-0.5 bg-primary text-primary-foreground text-[9px] font-semibold rounded hover:bg-primary/90 transition-colors"
            >
              View
            </button>
          )}
          {onCopy && (
            <button
              onClick={(e) => { e.stopPropagation(); onCopy(e); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="px-1.5 py-0.5 bg-primary text-primary-foreground text-[9px] font-semibold rounded hover:bg-primary/90 transition-colors"
            >
              Copy
            </button>
          )}
          {onAdd && (
            <button
              onClick={(e) => { e.stopPropagation(); onAdd(e); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="px-1.5 py-0.5 bg-primary text-primary-foreground text-[9px] font-semibold rounded hover:bg-primary/90 transition-colors"
            >
              Add
            </button>
          )}
        </div>
      )}

      {/* Time */}
      <div className="font-medium">
        {shift.start_time?.slice(0, 5)}–{shift.end_time?.slice(0, 5)}
      </div>

      {/* Published lock badge */}
      {shift.is_published && (
        <div className="flex items-center justify-center gap-0.5 mt-0.5">
          <Lock className="h-2.5 w-2.5" />
          <span className="text-[9px] font-semibold uppercase tracking-wider">Locked</span>
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
        "rounded-md px-1.5 py-1 text-[11px] leading-tight bg-warning/15 text-warning border border-warning/30 mb-0.5",
        onNavigate && "cursor-pointer hover:bg-warning/25 transition-colors"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onNavigate?.(shift.branch);
      }}
      title={onNavigate ? `Click to view at ${shift.branch}` : undefined}
    >
      <div className="font-medium">
        {shift.start_time?.slice(0, 5)}–{shift.end_time?.slice(0, 5)}
      </div>
      <div className="flex items-center justify-center gap-0.5 mt-0.5">
        <MapPin className="h-2.5 w-2.5" />
        <span className="text-[9px] font-medium">{shift.branch}</span>
      </div>
      {shift.is_published && (
        <div className="flex items-center justify-center gap-0.5 mt-0.5">
          <Lock className="h-2.5 w-2.5" />
          <span className="text-[9px] font-semibold uppercase tracking-wider">Locked</span>
        </div>
      )}
    </div>
  );
}
