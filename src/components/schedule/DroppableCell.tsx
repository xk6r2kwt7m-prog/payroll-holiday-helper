import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface DroppableCellProps {
  id: string;
  children: ReactNode;
  isAdmin: boolean;
  isToday: boolean;
  onClick?: () => void;
}

export function DroppableCell({ id, children, isAdmin, isToday, onClick }: DroppableCellProps) {
  const { isOver, setNodeRef } = useDroppable({ id });
  const isMobile = useIsMobile();

  return (
    <td
      ref={setNodeRef}
      className={cn(
        "group/cell p-0.5 sm:p-1 text-center transition-colors align-top",
        // Stronger column structure with consistent left border
        "border-l border-border/30",
        isToday && "bg-primary/[0.02]",
        isAdmin && "cursor-pointer",
        !isMobile && isOver && "bg-primary/8 ring-1 ring-inset ring-primary/20",
        isMobile && isAdmin && "active:bg-primary/[0.04]",
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
  const isMobile = useIsMobile();

  if (!isAdmin) return null;

  return (
    <div className={cn(
      "flex items-center justify-center rounded-md",
      "min-h-[40px] sm:min-h-[36px]",
      "transition-all",
      isMobile
        ? "active:bg-primary/[0.06]"
        : cn(
            "sm:border sm:border-dashed sm:border-transparent",
            "sm:group-hover/cell:border-border/30",
          ),
    )}>
      {!isMobile && (
        <span className="h-3 w-3 text-muted-foreground/30 hidden sm:group-hover/cell:block text-sm leading-none">+</span>
      )}
    </div>
  );
}
