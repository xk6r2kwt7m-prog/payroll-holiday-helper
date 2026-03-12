import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, AlertTriangle, CheckCircle2, XCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttendanceDashboardProps {
  entries: any[];
  evidenceFiles?: any[];
}

export function AttendanceDashboard({ entries, evidenceFiles = [] }: AttendanceDashboardProps) {
  const stats = useMemo(() => {
    const pending = entries.filter(e => e.status === "pending").length;
    const approved = entries.filter(e => e.status === "approved").length;
    const rejected = entries.filter(e => e.status === "rejected").length;
    const onShift = entries.filter(e => e.status === "clocked_in").length;
    const outsideGeofence = entries.filter(e =>
      e.clock_in_within_geofence === false || e.clock_out_within_geofence === false
    ).length;
    const missingClockOut = entries.filter(e =>
      !e.clock_out_time && e.status !== "clocked_in" && e.status !== "pending"
    ).length;
    const lateClockIns = entries.filter(e => {
      if (!e.scheduled_start || !e.clock_in_time) return false;
      const scheduled = e.scheduled_start.slice(0, 5);
      const actual = new Date(e.clock_in_time);
      const actualTime = `${actual.getHours().toString().padStart(2, "0")}:${actual.getMinutes().toString().padStart(2, "0")}`;
      return actualTime > scheduled;
    }).length;
    const pendingEvidence = evidenceFiles.filter(f => f.review_status === "pending_review").length;

    return { pending, approved, rejected, onShift, outsideGeofence, missingClockOut, lateClockIns, pendingEvidence };
  }, [entries, evidenceFiles]);

  const cards = [
    { label: "Pending Approval", value: stats.pending, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
    { label: "Approved", value: stats.approved, icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
    { label: "On Shift Now", value: stats.onShift, icon: Clock, color: "text-primary", bg: "bg-primary/10" },
    { label: "Geofence Issues", value: stats.outsideGeofence, icon: MapPin, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Late Clock-ins", value: stats.lateClockIns, icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
    { label: "Evidence Pending", value: stats.pendingEvidence, icon: FileText, color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      {cards.map((c) => (
        <Card key={c.label} className="border">
          <CardContent className="p-3 flex flex-col items-center text-center gap-1">
            <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", c.bg)}>
              <c.icon className={cn("h-4 w-4", c.color)} />
            </div>
            <span className="text-xl font-bold">{c.value}</span>
            <span className="text-[10px] text-muted-foreground leading-tight">{c.label}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
