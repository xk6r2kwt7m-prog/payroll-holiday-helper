import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import type { ReactNode } from "react";

interface DroppableCellProps {
  id: string;
  children: ReactNode;
  isAdmin: boolean;
  isToday: boolean;
  onClick?: () => void;
}

export function DroppableCell({ id, children, isAdmin, isToday, onClick }: DroppableCellProps) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <td
      ref={setNodeRef}
      className={cn(
        "group/cell p-0.5 sm:p-1 text-center border-l border-border/50 transition-colors align-top",
        isToday && "bg-primary/[0.03]",
        isAdmin && "cursor-pointer",
        isOver && "bg-primary/10 ring-1 ring-inset ring-primary/30"
      )}
      onClick={onClick}
    >
      {children}
    </td>
  );
}

interface EmptyDropCellProps {
  isAdmin: boolean;
}

export function EmptyDropCell({ isAdmin }: EmptyDropCellProps) {
  if (!isAdmin) return null;
  return (
    <div className={cn(
      "flex items-center justify-center rounded-lg",
      "min-h-[36px] sm:min-h-[40px]",
      "transition-all",
      // Mobile: clean empty cell, subtle tap feedback only
      "active:bg-primary/[0.08]",
      // Desktop: dashed border + icon appear on hover via group
      "sm:border sm:border-dashed sm:border-transparent",
      "sm:group-hover/cell:border-border/40 sm:group-hover/cell:bg-primary/[0.04]",
    )}>
      {/* Plus icon: hidden on mobile, visible on desktop cell hover */}
      <Plus className="h-3.5 w-3.5 text-muted-foreground/40 hidden sm:hidden sm:group-hover/cell:block" />
    </div>
  );
}
