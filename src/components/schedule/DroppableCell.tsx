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
        "border-l border-border/10",
        isToday && "bg-primary/[0.02]",
        isAdmin && "cursor-pointer",
        !isMobile && isOver && "bg-primary/[0.06] ring-1 ring-inset ring-primary/20",
        isMobile && isAdmin && "active:bg-primary/[0.03]",
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
      "min-h-[38px] sm:min-h-[34px]",
      "transition-all",
      isMobile
        ? "active:bg-primary/[0.04]"
        : "sm:group-hover/cell:bg-muted/20",
    )}>
      {!isMobile && (
        <span className="h-3 w-3 text-muted-foreground/10 hidden sm:group-hover/cell:block text-sm leading-none font-light">+</span>
      )}
    </div>
  );
}
