import { useState, useMemo, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Check, X, MapPin, AlertTriangle, Clock, Eye, FileQuestion, Filter } from "lucide-react";
import { format, startOfWeek, endOfWeek, addDays } from "date-fns";
import { useTimeEntries, useApproveTimeEntries, useRejectTimeEntry } from "@/hooks/useTimeEntries";
import { useBranchLocations } from "@/hooks/useSchedule";
import { useEvidenceFiles } from "@/hooks/useEvidence";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AttendanceDashboard } from "@/components/attendance/AttendanceDashboard";
import { TimesheetReviewPanel, computeFlags } from "@/components/attendance/TimesheetReviewPanel";
import { EvidenceRequestDialog } from "@/components/attendance/EvidenceRequestDialog";
import { useI18n } from "@/hooks/useI18n";
import { EmptyState } from "@/components/ui/EmptyState";
import { usePermission } from "@/hooks/useRolePermissions";
import { useTenantGuard } from "@/hooks/useTenantGuard";
import { Skeleton } from "@/components/ui/skeleton";

export default function Timesheets() {
  const { t } = useI18n();
  const canApproveTimesheets = usePermission("approve_timesheets");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reviewEntry, setReviewEntry] = useState<any>(null);
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);

  const resetPageState = useCallback(() => {
    setSelectedBranch("all");
    setStatusFilter("pending");
    setSelectedIds([]);
    setReviewEntry(null);
    setShowFlaggedOnly(false);
  }, []);
  const { tenantReady, assertTenantMatch } = useTenantGuard(resetPageState);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  const { data: entries, isLoading } = useTimeEntries(
    format(weekStart, "yyyy-MM-dd"),
    format(weekEnd, "yyyy-MM-dd"),
    statusFilter !== "all" ? statusFilter : undefined,
    selectedBranch !== "all" ? selectedBranch : undefined
  );
  const { data: branches } = useBranchLocations();
  const { data: evidenceFiles = [] } = useEvidenceFiles({});
  const approveEntries = useApproveTimeEntries();
  const rejectEntry = useRejectTimeEntry();

  const pendingCount = useMemo(
    () => entries?.filter((e: any) => e.status === "pending").length || 0,
    [entries]
  );

  const flaggedEntries = useMemo(() => {
    if (!entries) return [];
    return entries.filter((e: any) => computeFlags(e).length > 0);
  }, [entries]);

  const displayEntries = useMemo(() => {
    if (!entries) return [];
    if (showFlaggedOnly) return flaggedEntries;
    return entries;
  }, [entries, showFlaggedOnly, flaggedEntries]);

  const cleanPendingIds = useMemo(() => {
    if (!entries) return [];
    return entries
      .filter((e: any) => e.status === "pending" && computeFlags(e).length === 0)
      .map((e: any) => e.id);
  }, [entries]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAllPending = () => {
    const pendingIds = entries?.filter((e: any) => e.status === "pending").map((e: any) => e.id) || [];
    setSelectedIds(pendingIds);
  };

  const selectCleanPending = () => {
    setSelectedIds(cleanPendingIds);
  };

  const handleBulkApprove = async () => {
    try {
      await approveEntries.mutateAsync({ entryIds: selectedIds, mode: "approve_batch_selected" });
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

  if (!tenantReady) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-foreground">{t("timesheets.title")}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <EvidenceRequestDialog />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="clocked_in">{t("timesheets.on_shift")}</SelectItem>
                <SelectItem value="pending">{t("common.pending")}</SelectItem>
                <SelectItem value="approved">{t("payroll.status_approved")}</SelectItem>
                <SelectItem value="rejected">{t("payroll.status_rejected")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("timesheets.all_locations")}</SelectItem>
                {branches?.map((b) => (
                  <SelectItem key={b.branch} value={b.branch}>{b.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Dashboard Stats */}
        <AttendanceDashboard entries={entries || []} evidenceFiles={evidenceFiles} />

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
            {t("common.today")}
          </Button>
        </div>

        {/* Entries list */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base">
                {displayEntries.length} {t("timesheets.entries")}
                {pendingCount > 0 && (
                  <Badge variant="outline" className="ml-2 bg-warning/10 text-warning border-warning/30">
                    {pendingCount} {t("timesheets.pending")}
                  </Badge>
                )}
                {flaggedEntries.length > 0 && (
                  <Badge variant="outline" className="ml-2 bg-destructive/10 text-destructive border-destructive/30">
                    {flaggedEntries.length} {t("timesheets.flagged")}
                  </Badge>
                )}
              </CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={showFlaggedOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowFlaggedOnly(!showFlaggedOnly)}
                >
                   <AlertTriangle className="h-3 w-3 mr-1" />
                   {showFlaggedOnly ? t("timesheets.show_all") : t("timesheets.flagged_only")}
                </Button>
                {cleanPendingIds.length > 0 && (
                  <Button variant="outline" size="sm" onClick={selectCleanPending}>
                    <Check className="h-3 w-3 mr-1" />
                    {t("timesheets.select_clean", { count: String(cleanPendingIds.length) })}
                  </Button>
                )}
                {pendingCount > 0 && (
                  <Button variant="outline" size="sm" onClick={selectAllPending}>
                    {t("timesheets.select_all_pending")}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <p className="text-muted-foreground text-sm py-8 text-center">{t("common.loading")}</p>
            ) : displayEntries.length === 0 ? (
              <EmptyState
                icon={Clock}
                title={t("timesheets.no_entries_title") || "No timesheet entries this week"}
                description="Timesheets are created automatically when staff clock in and out. Once shifts start, entries will appear here for review and approval."
                compact
              />
            ) : (
              displayEntries.map((entry: any) => {
                const flags = computeFlags(entry);
                const hasFlags = flags.length > 0;
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border bg-card cursor-pointer hover:bg-muted/30 transition-colors",
                      hasFlags ? "border-warning/30" : "border-border"
                    )}
                    onClick={() => setReviewEntry(entry)}
                  >
                    {entry.status === "pending" && (
                      <Checkbox
                        checked={selectedIds.includes(entry.id)}
                        onCheckedChange={() => toggleSelect(entry.id)}
                        onClick={(e) => e.stopPropagation()}
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
                        {entry.total_hours && <span className="ml-1 font-medium">({entry.total_hours}h)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.department} · {entry.branch}
                        {entry.scheduled_start && (
                          <span className="text-primary ml-1">
                            ({entry.scheduled_start?.slice(0, 5)} - {entry.scheduled_end?.slice(0, 5)})
                          </span>
                        )}
                      </p>
                      {/* Inline flags */}
                      {hasFlags && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {flags.slice(0, 2).map((f, i) => (
                            <Badge key={i} variant="outline" className={cn(
                              "text-[10px] px-1.5 py-0",
                              f.severity === "error" ? "text-destructive border-destructive/30 bg-destructive/5" : "text-warning border-warning/30 bg-warning/5"
                            )}>
                              {f.label.length > 25 ? f.label.slice(0, 25) + "…" : f.label}
                            </Badge>
                          ))}
                          {flags.length > 2 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                              +{flags.length - 2} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className={cn("text-xs", statusColor(entry.status))}>
                        {entry.status === "clocked_in" ? t("timesheets.on_shift") : entry.status}
                      </Badge>
                      {entry.status === "pending" && (
                        <div className="flex gap-1">
                          {canApproveTimesheets && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-success hover:text-success"
                              onClick={(e) => {
                                e.stopPropagation();
                                approveEntries.mutateAsync([entry.id]).then(() => toast.success("Approved"));
                              }}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          {canApproveTimesheets && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReject(entry.id);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReviewEntry(entry);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Bulk approve bar */}
        {selectedIds.length > 0 && canApproveTimesheets && (
          <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-in-bottom">
            <Button
              onClick={handleBulkApprove}
              disabled={approveEntries.isPending}
              className="shadow-elevated px-6"
            >
              <Check className="h-4 w-4 mr-2" />
              {t("timesheets.approve_count", { count: String(selectedIds.length) })}
            </Button>
          </div>
        )}

        {/* Review Panel */}
        <TimesheetReviewPanel
          entry={reviewEntry}
          open={!!reviewEntry}
          onClose={() => setReviewEntry(null)}
          branchLocations={branches}
        />
      </div>
    </AppLayout>
  );
}
