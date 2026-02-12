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
        "p-1 text-center border-l border-border transition-colors",
        isToday ? "bg-primary/5" : "",
        isAdmin && "cursor-pointer hover:bg-muted/50",
        isOver && "bg-primary/15 ring-2 ring-inset ring-primary/30"
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
    <div className="flex items-center justify-center h-8 opacity-0 hover:opacity-40 transition-opacity">
      <Plus className="h-3.5 w-3.5 text-muted-foreground" />
    </div>
  );
}
