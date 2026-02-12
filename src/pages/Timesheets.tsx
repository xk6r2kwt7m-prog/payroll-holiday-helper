import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Check, X, MapPin, AlertTriangle, Clock } from "lucide-react";
import { format, startOfWeek, endOfWeek, addDays } from "date-fns";
import { useTimeEntries, useApproveTimeEntries, useRejectTimeEntry } from "@/hooks/useTimeEntries";
import { useBranchLocations } from "@/hooks/useSchedule";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Timesheets() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  const { data: entries, isLoading } = useTimeEntries(
    format(weekStart, "yyyy-MM-dd"),
    format(weekEnd, "yyyy-MM-dd"),
    statusFilter !== "all" ? statusFilter : undefined,
    selectedBranch !== "all" ? selectedBranch : undefined
  );
  const { data: branches } = useBranchLocations();
  const approveEntries = useApproveTimeEntries();
  const rejectEntry = useRejectTimeEntry();

  const pendingCount = useMemo(
    () => entries?.filter((e: any) => e.status === "pending").length || 0,
    [entries]
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAllPending = () => {
    const pendingIds = entries?.filter((e: any) => e.status === "pending").map((e: any) => e.id) || [];
    setSelectedIds(pendingIds);
  };

  const handleBulkApprove = async () => {
    try {
      await approveEntries.mutateAsync(selectedIds);
      toast.success(`Approved ${selectedIds.length} timesheet(s)`);
      setSelectedIds([]);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectEntry.mutateAsync({ id });
      toast.success("Timesheet rejected");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-warning/15 text-warning border-warning/30";
      case "approved": return "bg-success/15 text-success border-success/30";
      case "rejected": return "bg-destructive/15 text-destructive border-destructive/30";
      case "clocked_in": return "bg-primary/15 text-primary border-primary/30";
      default: return "";
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-foreground">Timesheets</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="clocked_in">On Shift</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {branches?.map((b) => (
                  <SelectItem key={b.branch} value={b.branch}>{b.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate((d) => addDays(d, -7))}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-base font-semibold text-center">
            {format(weekStart, "d MMM")} – {format(weekEnd, "d MMM yyyy")}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate((d) => addDays(d, 7))}>
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
        </div>

        {/* Entries list */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {entries?.length || 0} Entries
                {pendingCount > 0 && (
                  <Badge variant="outline" className="ml-2 bg-warning/10 text-warning border-warning/30">
                    {pendingCount} pending
                  </Badge>
                )}
              </CardTitle>
              {pendingCount > 0 && (
                <Button variant="outline" size="sm" onClick={selectAllPending}>
                  Select All Pending
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <p className="text-muted-foreground text-sm py-8 text-center">Loading...</p>
            ) : entries?.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">No timesheet entries found</p>
            ) : (
              entries?.map((entry: any) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
                >
                  {entry.status === "pending" && (
                    <Checkbox
                      checked={selectedIds.includes(entry.id)}
                      onCheckedChange={() => toggleSelect(entry.id)}
                    />
                  )}
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                    {entry.employees?.forename?.[0] || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {entry.employees?.forename} {entry.employees?.surname}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {entry.clock_in_time ? format(new Date(entry.clock_in_time), "HH:mm") : "–"}
                      {" – "}
                      {entry.clock_out_time ? format(new Date(entry.clock_out_time), "HH:mm") : "on shift"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.department} · {entry.branch}
                      {entry.scheduled_start && (
                        <span className="text-primary ml-1">
                          ({entry.scheduled_start?.slice(0, 5)} - {entry.scheduled_end?.slice(0, 5)})
                        </span>
                      )}
                    </p>
                    {entry.manager_override && (
                      <p className="text-xs text-warning flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="h-3 w-3" /> Manager override
                      </p>
                    )}
                    {(!entry.clock_in_within_geofence || !entry.clock_out_within_geofence) && entry.status !== "clocked_in" && (
                      <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" /> Outside geofence
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className={cn("text-xs", statusColor(entry.status))}>
                      {entry.status === "clocked_in" ? "On Shift" : entry.status}
                    </Badge>
                    {entry.total_hours && (
                      <span className="text-xs text-muted-foreground font-medium">
                        {entry.total_hours}h
                      </span>
                    )}
                    {entry.status === "pending" && (
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-success hover:text-success"
                          onClick={() => {
                            approveEntries.mutateAsync([entry.id]).then(() => toast.success("Approved"));
                          }}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleReject(entry.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Bulk approve bar */}
        {selectedIds.length > 0 && (
          <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-in-bottom">
            <Button
              onClick={handleBulkApprove}
              disabled={approveEntries.isPending}
              className="shadow-elevated px-6"
            >
              <Check className="h-4 w-4 mr-2" />
              Approve {selectedIds.length} Timesheet{selectedIds.length > 1 ? "s" : ""}
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
