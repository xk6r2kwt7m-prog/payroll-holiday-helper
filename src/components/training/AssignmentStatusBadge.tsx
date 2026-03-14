import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function AssignmentStatusBadge({ status, isOverdue }: { status: string; isOverdue: boolean }) {
  if (isOverdue) return <Badge className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">Overdue</Badge>;
  const styles: Record<string, string> = {
    assigned: "bg-muted text-muted-foreground",
    viewed: "bg-primary/10 text-primary",
    acknowledged: "bg-warning/10 text-warning",
    completed: "bg-success/10 text-success",
    cancelled: "bg-muted text-muted-foreground line-through",
  };
  return <Badge className={cn("text-[10px]", styles[status] || styles.assigned)}>{status}</Badge>;
}
