import { FileText, AlertTriangle, Clock, X, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useDocumentRequestStats } from "@/hooks/useDocumentRequests";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function DocumentRequestsWidget() {
  const { data: stats } = useDocumentRequestStats();

  if (!stats || stats.total === 0) return null;

  const items = [
    { label: "Overdue", count: stats.overdue, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Due Soon", count: stats.dueSoon, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
    { label: "Pending Review", count: stats.pendingReview, icon: FileText, color: "text-primary", bg: "bg-primary/10" },
    { label: "Rejected", count: stats.rejected, icon: X, color: "text-destructive", bg: "bg-destructive/10" },
  ].filter(i => i.count > 0);

  if (items.length === 0) return null;

  return (
    <Link to="/employees?tab=documents" className="block rounded-xl bg-card border border-border p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Document Requests</h3>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map(item => (
          <div key={item.label} className="flex items-center gap-2.5 rounded-lg bg-muted/30 px-3 py-2">
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", item.bg)}>
              <item.icon className={cn("h-4 w-4", item.color)} />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground leading-tight">{item.count}</p>
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </Link>
  );
}
