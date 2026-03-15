import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const styles: Record<string, { label: string; className: string }> = {
  assigned: { label: "Not Started", className: "bg-muted text-muted-foreground" },
  viewed: { label: "In Progress", className: "bg-primary/10 text-primary" },
  acknowledged: { label: "Acknowledged", className: "bg-success/10 text-success" },
  completed: { label: "Completed", className: "bg-success/10 text-success" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground line-through" },
  failed: { label: "Failed", className: "bg-destructive/10 text-destructive" },
};

export function AssignmentStatusBadge({ status, isOverdue, signoffPending }: {
  status: string;
  isOverdue: boolean;
  signoffPending?: boolean;
}) {
  if (isOverdue) return <Badge className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">Overdue</Badge>;
  if (signoffPending) return <Badge className="text-[10px] bg-warning/10 text-warning border-warning/20">Awaiting Sign-off</Badge>;
  const s = styles[status] || styles.assigned;
  return <Badge className={cn("text-[10px]", s.className)}>{s.label}</Badge>;
}
