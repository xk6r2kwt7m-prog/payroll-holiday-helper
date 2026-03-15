import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AssignmentStatusBadge } from "@/components/training/AssignmentStatusBadge";
import {
  AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert, Loader2,
  Search, Download,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  useTrainingAssignments,
} from "@/hooks/useTrainingLibrary";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { exportToCsv } from "@/lib/csv-export";
import { toast } from "sonner";
import { usePermission } from "@/hooks/useRolePermissions";

export function TrainingCompletionDashboard({ highlightEmployeeId, highlightModuleId }: { highlightEmployeeId?: string; highlightModuleId?: string } = {}) {
  const { data: assignments = [], isLoading, isFetching } = useTrainingAssignments();
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const canManage = usePermission("manage_training");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const highlightRef = useRef<HTMLDivElement>(null);
  const hasScrolled = useRef(false);
  const [hasRefreshed, setHasRefreshed] = useState(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const highlightKey = highlightEmployeeId && highlightModuleId
    ? `${highlightEmployeeId}::${highlightModuleId}` : null;

  const { data: existsInDb, isLoading: existenceLoading } = useQuery({
    queryKey: ["training_assignment_exists", highlightEmployeeId, highlightModuleId],
    queryFn: async () => {
      if (!highlightEmployeeId || !highlightModuleId || !tenantId) return false;
      const { count, error } = await supabase
        .from("training_assignments" as any)
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("employee_id", highlightEmployeeId)
        .eq("document_id", highlightModuleId)
        .not("status", "eq", "cancelled");
      if (error) return false;
      return (count ?? 0) > 0;
    },
    enabled: !!highlightKey && !!tenantId,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (highlightKey) {
      setStatusFilter("all");
      hasScrolled.current = false;
      setHasRefreshed(false);
    }
  }, [highlightKey]);

  const matchInScope = highlightKey
    ? assignments.some(a => `${a.employee_id}::${a.document_id}` === highlightKey)
    : false;

  useEffect(() => {
    if (highlightKey && matchInScope && highlightRef.current && !hasScrolled.current) {
      hasScrolled.current = true;
      const t = setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
      return () => clearTimeout(t);
    }
  }, [highlightKey, matchInScope, assignments]);

  type NoMatchState = "loading" | "not_found" | "scope_restricted" | null;
  let noMatchState: NoMatchState = null;
  if (highlightKey && !matchInScope) {
    if (isLoading || isFetching || isManualRefreshing || existenceLoading) {
      noMatchState = "loading";
    } else if (existsInDb) {
      noMatchState = "scope_restricted";
    } else {
      noMatchState = "not_found";
    }
  }

  const handleRefresh = useCallback(async () => {
    setIsManualRefreshing(true);
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ["training_assignments"] }),
      queryClient.refetchQueries({ queryKey: ["training_assignment_exists", highlightEmployeeId, highlightModuleId] }),
    ]);
    setIsManualRefreshing(false);
    setHasRefreshed(true);
  }, [queryClient, highlightEmployeeId, highlightModuleId]);

  const counts = {
    all: assignments.length,
    assigned: assignments.filter(a => a.status === "assigned").length,
    viewed: assignments.filter(a => a.status === "viewed").length,
    acknowledged: assignments.filter(a => a.status === "acknowledged").length,
    completed: assignments.filter(a => a.status === "completed").length,
    overdue: assignments.filter(a => {
      if (!a.due_date) return false;
      return differenceInDays(new Date(), parseISO(a.due_date)) > 0 && !["completed", "acknowledged", "cancelled"].includes(a.status);
    }).length,
  };

  let filtered = statusFilter === "all" ? assignments :
    statusFilter === "overdue" ? assignments.filter(a => {
      if (!a.due_date) return false;
      return differenceInDays(new Date(), parseISO(a.due_date)) > 0 && !["completed", "acknowledged", "cancelled"].includes(a.status);
    }) : assignments.filter(a => a.status === statusFilter);

  // Search filter
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(a =>
      `${a.employees?.forename} ${a.employees?.surname}`.toLowerCase().includes(q) ||
      a.training_library?.title?.toLowerCase().includes(q)
    );
  }

  // When deep-linked, bring matching assignment to top
  if (highlightKey) {
    filtered = [...filtered].sort((a, b) => {
      const aMatch = `${a.employee_id}::${a.document_id}` === highlightKey ? 0 : 1;
      const bMatch = `${b.employee_id}::${b.document_id}` === highlightKey ? 0 : 1;
      return aMatch - bMatch;
    });
  }

  const handleExport = () => {
    exportToCsv("training-assignments", [
      { header: "Employee", accessor: (a: any) => `${a.employees?.forename} ${a.employees?.surname}` },
      { header: "Department", accessor: (a: any) => a.employees?.department },
      { header: "Module", accessor: (a: any) => a.training_library?.title },
      { header: "Status", accessor: (a: any) => a.status },
      { header: "Due Date", accessor: (a: any) => a.due_date ? format(parseISO(a.due_date), "dd/MM/yyyy") : "" },
      { header: "Completed", accessor: (a: any) => a.completed_at ? format(parseISO(a.completed_at), "dd/MM/yyyy") : "" },
      { header: "Score", accessor: (a: any) => a.score ?? "" },
      { header: "Mandatory", accessor: (a: any) => a.is_mandatory ? "Yes" : "No" },
    ], filtered);
    toast.success("Assignments exported");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Assignment Tracking</h2>
        {canManage && filtered.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search employee or module..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 h-9" />
      </div>

      {/* Status chips */}
      <div className="flex gap-1.5 flex-wrap">
        {[
          { key: "all", label: "All", count: counts.all },
          { key: "assigned", label: "Pending", count: counts.assigned },
          { key: "overdue", label: "Overdue", count: counts.overdue },
          { key: "completed", label: "Completed", count: counts.completed },
          { key: "acknowledged", label: "Acknowledged", count: counts.acknowledged },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setStatusFilter(s.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap",
              statusFilter === s.key
                ? "bg-primary/10 text-primary border-primary/20 shadow-sm"
                : "bg-card text-muted-foreground border-border"
            )}
          >
            {s.label}
            <span className="tabular-nums font-bold">{s.count}</span>
          </button>
        ))}
      </div>

      {/* Deep-link banners */}
      {noMatchState === "loading" && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-center gap-2">
          <Loader2 className="h-4 w-4 text-muted-foreground animate-spin flex-shrink-0" />
          <p className="text-xs text-muted-foreground">Loading assignment data…</p>
        </div>
      )}
      {noMatchState === "not_found" && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-warning font-medium">Assignment not found</p>
            <p className="text-[11px] text-warning/80 mt-0.5">
              {hasRefreshed
                ? "This assignment does not exist yet."
                : "This assignment may not exist yet. Refresh to check for recent changes."}
            </p>
          </div>
          {!hasRefreshed && (
            <Button variant="outline" size="sm" className="shrink-0 h-7 text-xs gap-1.5 border-warning/30 text-warning hover:bg-warning/10"
              onClick={handleRefresh} disabled={isManualRefreshing}>
              <RefreshCw className={cn("h-3 w-3", isManualRefreshing && "animate-spin")} /> Refresh
            </Button>
          )}
        </div>
      )}
      {noMatchState === "scope_restricted" && (
        <div className="rounded-lg border border-muted-foreground/20 bg-muted/30 p-3 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <p className="text-xs text-muted-foreground">This assignment exists but is outside your branch scope.</p>
        </div>
      )}

      {/* Assignment list */}
      <div className="space-y-1.5">
        {filtered.length === 0 && !highlightKey && (
          <div className="text-center py-8">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm font-medium text-foreground mb-1">No assignments match this filter</p>
            <p className="text-xs text-muted-foreground">Try adjusting your search or status filter.</p>
          </div>
        )}
        {filtered.slice(0, 50).map(a => {
          const doc = a.training_library;
          const isOverdue = a.due_date && differenceInDays(new Date(), parseISO(a.due_date)) > 0 && !["completed", "acknowledged", "cancelled"].includes(a.status);
          const signoffPending = a.signoff_required && !a.signed_off_at && a.status !== "cancelled" && a.status !== "completed";
          const isMatch = `${a.employee_id}::${a.document_id}` === highlightKey;
          return (
            <div
              key={a.id}
              ref={isMatch ? highlightRef : undefined}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl bg-card border shadow-sm transition-all",
                isMatch ? "border-primary ring-2 ring-primary/20" : "border-border"
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {a.employees?.forename} {a.employees?.surname}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {doc?.title || "Unknown document"}
                  {a.due_date && ` · Due ${format(parseISO(a.due_date), "d MMM")}`}
                  {a.score != null && ` · Score: ${a.score}%`}
                </p>
              </div>
              <AssignmentStatusBadge status={a.status} isOverdue={!!isOverdue} signoffPending={signoffPending} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
