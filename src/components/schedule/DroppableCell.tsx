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
        "group/cell p-0.5 sm:p-1 text-center border-l border-border/50 transition-colors align-top",
        isToday && "bg-primary/[0.03]",
        isAdmin && "cursor-pointer",
        // Desktop: show drop indicator
        !isMobile && isOver && "bg-primary/10 ring-1 ring-inset ring-primary/30",
        // Mobile: active tap highlight
        isMobile && isAdmin && "active:bg-primary/[0.06]",
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
      "flex items-center justify-center rounded-lg",
      // Mobile: taller tap target, completely clean — no icons, no borders
      "min-h-[44px] sm:min-h-[40px]",
      "transition-all",
      isMobile
        ? "active:bg-primary/[0.08]"
        : cn(
            "sm:border sm:border-dashed sm:border-transparent",
            "sm:group-hover/cell:border-border/40 sm:group-hover/cell:bg-primary/[0.04]",
          ),
    )}>
      {/* Plus icon: desktop hover only */}
      {!isMobile && (
        <span className="h-3.5 w-3.5 text-muted-foreground/40 hidden sm:group-hover/cell:block text-lg leading-none">+</span>
      )}
    </div>
  );
}
