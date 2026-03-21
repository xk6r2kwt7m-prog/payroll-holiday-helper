import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Check, X, MapPin, Clock, AlertTriangle, FileText } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useApproveTimeEntries, useRejectTimeEntry } from "@/hooks/useTimeEntries";
import { useEvidenceFiles } from "@/hooks/useEvidence";
import { toast } from "sonner";

interface TimesheetReviewPanelProps {
  entry: any;
  open: boolean;
  onClose: () => void;
  branchLocations?: any[];
}

function computeFlags(entry: any): { type: "time" | "location" | "approval"; label: string; severity: "warning" | "error" }[] {
  const flags: any[] = [];
  if (!entry) return flags;

  // Time flags
  if (entry.scheduled_start && entry.clock_in_time) {
    const scheduled = entry.scheduled_start.slice(0, 5);
    const actual = format(new Date(entry.clock_in_time), "HH:mm");
    if (actual > scheduled) flags.push({ type: "time", label: `Late clock-in (scheduled ${scheduled}, actual ${actual})`, severity: "warning" });
  }
  if (entry.scheduled_end && entry.clock_out_time) {
    const scheduled = entry.scheduled_end.slice(0, 5);
    const actual = format(new Date(entry.clock_out_time), "HH:mm");
    if (actual < scheduled) flags.push({ type: "time", label: `Early clock-out (scheduled ${scheduled}, actual ${actual})`, severity: "warning" });
  }
  if (!entry.clock_out_time && entry.status !== "clocked_in") {
    flags.push({ type: "time", label: "Missing clock-out", severity: "error" });
  }
  if (!entry.shift_id) {
    flags.push({ type: "time", label: "Unscheduled shift", severity: "warning" });
  }
  if (entry.total_hours && entry.total_hours < 1) {
    flags.push({ type: "time", label: `Very short shift (${entry.total_hours}h)`, severity: "warning" });
  }
  if (entry.total_hours && entry.total_hours > 12) {
    flags.push({ type: "time", label: `Very long shift (${entry.total_hours}h)`, severity: "warning" });
  }
  if (entry.total_hours && entry.total_hours >= 6 && (!entry.break_minutes || entry.break_minutes === 0)) {
    flags.push({ type: "time", label: "No break recorded (6h+ shift)", severity: "warning" });
  }

  // Location flags
  if (entry.clock_in_within_geofence === false) {
    flags.push({ type: "location", label: "Clock-in outside geofence", severity: "error" });
  }
  if (entry.clock_out_within_geofence === false && entry.clock_out_time) {
    flags.push({ type: "location", label: "Clock-out outside geofence", severity: "error" });
  }
  if (!entry.clock_in_latitude && !entry.clock_in_longitude) {
    flags.push({ type: "location", label: "No GPS data captured", severity: "warning" });
  }
  if (entry.manager_override) {
    flags.push({ type: "approval", label: "Manager override used", severity: "warning" });
  }

  return flags;
}

function LocationMapPreview({ lat, lng, label, withinGeofence }: { lat?: number; lng?: number; label: string; withinGeofence?: boolean | null }) {
  if (!lat || !lng) return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted/50 rounded">
      <MapPin className="h-3 w-3" /> No location data for {label}
    </div>
  );

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{label}</span>
        <Badge variant="outline" className={cn("text-[10px]", withinGeofence ? "text-success border-success/30" : "text-destructive border-destructive/30")}>
          {withinGeofence ? "In geofence" : "Outside geofence"}
        </Badge>
      </div>
      <a
        href={`https://www.google.com/maps?q=${lat},${lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 p-2 bg-muted/50 rounded text-xs text-primary hover:bg-muted transition-colors"
      >
        <Navigation className="h-3 w-3" />
        {lat.toFixed(5)}, {lng.toFixed(5)}
        <span className="text-muted-foreground ml-auto">View on map →</span>
      </a>
    </div>
  );
}

export function TimesheetReviewPanel({ entry, open, onClose, branchLocations }: TimesheetReviewPanelProps) {
  const [rejectNotes, setRejectNotes] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const approveEntries = useApproveTimeEntries();
  const rejectEntry = useRejectTimeEntry();
  const { data: evidenceFiles = [] } = useEvidenceFiles({ employeeId: entry?.employee_id });

  if (!entry) return null;

  const flags = computeFlags(entry);
  const hasFlags = flags.length > 0;
  const isPending = entry.status === "pending";

  const handleApprove = async () => {
    try {
      await approveEntries.mutateAsync([entry.id]);
      toast.success("Approved");
      onClose();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleReject = async () => {
    try {
      await rejectEntry.mutateAsync({ id: entry.id, notes: rejectNotes });
      toast.success("Rejected");
      setRejectNotes("");
      setShowRejectForm(false);
      onClose();
    } catch (err: any) { toast.error(err.message); }
  };

  // Find branch location for distance calc
  const branchLoc = branchLocations?.find(b => b.branch === entry.branch);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left">Timesheet Review</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          {/* Employee info */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
              {entry.employees?.forename?.[0] || "?"}
            </div>
            <div>
              <p className="font-medium">{entry.employees?.forename} {entry.employees?.surname}</p>
              <p className="text-xs text-muted-foreground">{entry.department} · {entry.branch}</p>
            </div>
          </div>

          {/* Flags */}
          {hasFlags && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Flags ({flags.length})</p>
              {flags.map((f, i) => (
                <div key={i} className={cn(
                  "flex items-center gap-2 text-xs p-2 rounded",
                  f.severity === "error" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
                )}>
                  <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                  {f.label}
                </div>
              ))}
            </div>
          )}

          <Separator />

          {/* Time details */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Shift Details</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Scheduled</p>
                <p className="font-medium">
                  {entry.scheduled_start ? `${entry.scheduled_start.slice(0, 5)} – ${entry.scheduled_end?.slice(0, 5)}` : "No shift scheduled"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Actual</p>
                <p className="font-medium">
                  {format(new Date(entry.clock_in_time), "HH:mm")}
                  {entry.clock_out_time ? ` – ${format(new Date(entry.clock_out_time), "HH:mm")}` : " – still on shift"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Hours</p>
                <p className="font-medium">{entry.total_hours ? `${entry.total_hours}h` : "–"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Break</p>
                <p className="font-medium">{entry.break_minutes ? `${entry.break_minutes} min` : "None"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="font-medium">{format(new Date(entry.clock_in_time), "EEE d MMM yyyy")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant="outline" className="text-xs">{entry.status}</Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Location */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Location Verification</p>
            <LocationMapPreview
              lat={entry.clock_in_latitude}
              lng={entry.clock_in_longitude}
              label="Clock-in"
              withinGeofence={entry.clock_in_within_geofence}
            />
            <LocationMapPreview
              lat={entry.clock_out_latitude}
              lng={entry.clock_out_longitude}
              label="Clock-out"
              withinGeofence={entry.clock_out_within_geofence}
            />
            {branchLoc && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                <MapPin className="h-3 w-3" />
                Expected: {branchLoc.display_name} ({branchLoc.geofence_radius_meters}m radius)
              </div>
            )}
          </div>

          {/* Notes */}
          {(entry.notes || entry.override_reason) && (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</p>
                {entry.notes && <p className="text-sm bg-muted/50 p-2 rounded">{entry.notes}</p>}
                {entry.override_reason && (
                  <p className="text-sm bg-warning/10 p-2 rounded text-warning">Override: {entry.override_reason}</p>
                )}
              </div>
            </>
          )}

          {/* Evidence */}
          {evidenceFiles.length > 0 && (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Evidence Files ({evidenceFiles.length})</p>
                {evidenceFiles.slice(0, 5).map((f: any) => (
                  <div key={f.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate flex-1">{f.original_filename}</span>
                    <Badge variant="outline" className="text-[10px]">{f.review_status}</Badge>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Actions */}
          {isPending && (
            <>
              <Separator />
              {showRejectForm ? (
                <div className="space-y-2">
                  <Textarea
                    value={rejectNotes}
                    onChange={(e) => setRejectNotes(e.target.value)}
                    placeholder="Reason for rejection (optional)"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button variant="destructive" onClick={handleReject} disabled={rejectEntry.isPending} className="flex-1">
                      Confirm Reject
                    </Button>
                    <Button variant="outline" onClick={() => setShowRejectForm(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={handleApprove} disabled={approveEntries.isPending} className="flex-1">
                    <Check className="h-4 w-4 mr-2" /> Approve
                  </Button>
                  <Button variant="destructive" onClick={() => setShowRejectForm(true)} className="flex-1">
                    <X className="h-4 w-4 mr-2" /> Reject
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Recommendation */}
          {isPending && (
            <div className={cn(
              "p-3 rounded-lg text-sm",
              hasFlags ? "bg-warning/10 border border-warning/20" : "bg-success/10 border border-success/20"
            )}>
              <p className="font-medium">{hasFlags ? "⚠️ Review Recommended" : "✅ Looks Good"}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {hasFlags
                  ? `${flags.length} flag(s) detected. Review before approving.`
                  : "No inconsistencies found. Safe to approve."
                }
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export { computeFlags };
