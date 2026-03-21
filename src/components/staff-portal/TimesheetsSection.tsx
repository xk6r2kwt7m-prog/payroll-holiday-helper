import { useState } from "react";
import { format } from "date-fns";
import { Clock, ChevronDown, ChevronUp, MapPin, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { useMyTimeEntries } from "@/hooks/useTimeEntries";
import { ClockEventLocations } from "@/components/attendance/LocationMapPreview";

export function TimesheetsSection() {
  const { data: myEntries } = useMyTimeEntries();
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
      {myEntries.slice(0, 20).map((entry: any) => {
        const isExpanded = expandedId === entry.id;
        const hasLocation = entry.clock_in_latitude || entry.clock_out_latitude;

        return (
          <div key={entry.id} className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
            {/* Main row */}
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : entry.id)}
              className="flex items-center justify-between p-3 w-full text-left hover:bg-muted/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {format(new Date(entry.clock_in_time), "EEE d MMM")}
                  </p>
                  {hasLocation && (
                    <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {format(new Date(entry.clock_in_time), "HH:mm")}
                  {entry.clock_out_time ? ` – ${format(new Date(entry.clock_out_time), "HH:mm")}` : " – on shift"}
                  {entry.total_hours ? ` · ${entry.total_hours}h` : ""}
                  {entry.break_minutes ? ` · ${entry.break_minutes}min break` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="outline" className={cn("text-[10px]", {
                  "text-warning border-warning/30": entry.status === "pending",
                  "text-success border-success/30": entry.status === "approved",
                  "text-destructive border-destructive/30": entry.status === "rejected",
                  "text-primary border-primary/30": entry.status === "clocked_in",
                })}>
                  {entry.status === "clocked_in" ? "Active" : entry.status}
                </Badge>
                {(entry as any).manager_adjusted && (
                  <Badge variant="outline" className="text-[9px] text-warning border-warning/30">
                    <Pencil className="h-2.5 w-2.5 mr-0.5" />Adjusted
                  </Badge>
                )}
                {isExpanded
                  ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                }
              </div>
            </button>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
                {/* Time details */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Clock-in</p>
                    <p className="font-medium">{format(new Date(entry.clock_in_time), "HH:mm · d MMM yyyy")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Clock-out</p>
                    <p className="font-medium">
                      {entry.clock_out_time
                        ? format(new Date(entry.clock_out_time), "HH:mm · d MMM yyyy")
                        : "Still on shift"}
                    </p>
                  </div>
                  {entry.branch && (
                    <div>
                      <p className="text-muted-foreground">Branch</p>
                      <p className="font-medium">{entry.branch}</p>
                    </div>
                  )}
                  {entry.total_hours != null && (
                    <div>
                      <p className="text-muted-foreground">Total hours</p>
                      <p className="font-medium">{entry.total_hours}h</p>
                    </div>
                  )}
                </div>

                {/* Manager adjustment note (read-only for staff) */}
                {(entry as any).manager_adjusted && (entry as any).adjustment_reason && (
                  <div className="flex items-start gap-2 p-2 rounded bg-warning/10 border border-warning/20">
                    <Pencil className="h-3 w-3 text-warning mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] font-medium text-warning">Manager adjustment</p>
                      <p className="text-[10px] text-muted-foreground">{(entry as any).adjustment_reason}</p>
                    </div>
                  </div>
                )}

                {/* Location section */}
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Location
                  </p>
                  <ClockEventLocations
                    clockInLat={entry.clock_in_latitude}
                    clockInLng={entry.clock_in_longitude}
                    clockInGeofence={entry.clock_in_within_geofence}
                    clockOutLat={entry.clock_out_latitude}
                    clockOutLng={entry.clock_out_longitude}
                    clockOutGeofence={entry.clock_out_within_geofence}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
