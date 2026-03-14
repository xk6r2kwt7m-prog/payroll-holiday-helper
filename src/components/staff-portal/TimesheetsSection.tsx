import { format } from "date-fns";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { useMyTimeEntries } from "@/hooks/useTimeEntries";

export function TimesheetsSection() {
  const { data: myEntries } = useMyTimeEntries();

  if (!myEntries || myEntries.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="No timesheets yet"
        description="Your shift records will appear here automatically after you clock in and out."
        hint="Timesheets are created from your time clock entries and reviewed by your manager."
        compact
      />
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
        Recent Timesheets
      </h2>
      {myEntries.slice(0, 20).map((entry: any) => (
        <div key={entry.id} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border shadow-sm">
          <div>
            <p className="text-sm font-medium text-foreground">
              {format(new Date(entry.clock_in_time), "EEE d MMM")}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {format(new Date(entry.clock_in_time), "HH:mm")}
              {entry.clock_out_time ? ` – ${format(new Date(entry.clock_out_time), "HH:mm")}` : " – on shift"}
              {entry.total_hours ? ` · ${entry.total_hours}h` : ""}
            </p>
          </div>
          <Badge variant="outline" className={cn("text-[10px]", {
            "text-warning border-warning/30": entry.status === "pending",
            "text-success border-success/30": entry.status === "approved",
            "text-destructive border-destructive/30": entry.status === "rejected",
            "text-primary border-primary/30": entry.status === "clocked_in",
          })}>
            {entry.status === "clocked_in" ? "Active" : entry.status}
          </Badge>
        </div>
      ))}
    </div>
  );
}
