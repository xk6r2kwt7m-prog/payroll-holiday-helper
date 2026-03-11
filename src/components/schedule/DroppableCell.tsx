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
        "p-0.5 sm:p-1 text-center border-l border-border/50 transition-colors align-top",
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
      // Mobile: clean empty cell, subtle highlight on active/tap
      "active:bg-primary/[0.08]",
      // Desktop: show dashed border and + on hover
      "sm:border sm:border-dashed sm:border-transparent sm:hover:border-border/40 sm:hover:bg-primary/[0.04]",
    )}>
      <Plus className="h-3.5 w-3.5 text-muted-foreground/40 hidden sm:group-hover/cell:block sm:hidden sm:hover:block opacity-0 sm:opacity-0 sm:hover:opacity-100 transition-opacity" />
    </div>
  );
}
