import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen, Plus, FileText, Shield, GraduationCap, AlertTriangle,
  CheckCircle2, Clock, Eye, Users, Search, Upload, Sparkles, RefreshCw, ShieldAlert, Loader2,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  useTrainingLibrary,
  useCreateLibraryItem,
  useTrainingAssignments,
  useCreateAssignments,
  LIBRARY_CATEGORIES,
  type TrainingLibraryItem,
} from "@/hooks/useTrainingLibrary";
import { useEmployees } from "@/hooks/useEmployees";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

// ─── Library Manager ───

export function TrainingLibraryManager() {
  const { data: library = [] } = useTrainingLibrary();
  const { data: assignments = [] } = useTrainingAssignments();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedDoc, setSelectedDoc] = useState<TrainingLibraryItem | null>(null);

  const filtered = library.filter(item => {
    const matchesSearch = !searchQuery || item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const getAssignmentStats = (docId: string) => {
    const docAssignments = assignments.filter(a => a.document_id === docId);
    return {
      total: docAssignments.length,
      completed: docAssignments.filter(a => a.status === "completed" || a.status === "acknowledged").length,
      overdue: docAssignments.filter(a => {
        if (!a.due_date) return false;
        return differenceInDays(new Date(), parseISO(a.due_date)) > 0 && a.status === "assigned";
      }).length,
    };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-foreground">Document Library</h2>
          <p className="text-xs text-muted-foreground">{library.length} documents</p>
        </div>
        <AddDocumentDialog />
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {LIBRARY_CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Document List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No documents yet</p>
          </div>
        )}
        {filtered.map(item => {
          const stats = getAssignmentStats(item.id);
          const catLabel = LIBRARY_CATEGORIES.find(c => c.value === item.category)?.label || item.category;
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border shadow-sm cursor-pointer active:bg-muted transition-all"
              onClick={() => setSelectedDoc(item)}
            >
              <div className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                item.content_type === "internal_page" ? "bg-primary/10" :
                item.requires_quiz ? "bg-accent/10" :
                item.requires_acknowledgement ? "bg-warning/10" :
                "bg-primary/10"
              )}>
                {item.content_type === "internal_page" ? <BookOpen className="h-5 w-5 text-primary" /> :
                 item.requires_quiz ? <GraduationCap className="h-5 w-5 text-accent" /> :
                 item.requires_acknowledgement ? <Shield className="h-5 w-5 text-warning" /> :
                 <FileText className="h-5 w-5 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-[10px]">{catLabel}</Badge>
                  {item.version > 1 && <Badge variant="secondary" className="text-[10px]">v{item.version}</Badge>}
                  {item.counts_toward_readiness && <Badge className="text-[10px] bg-primary/10 text-primary">Readiness</Badge>}
                </div>
              </div>
              <div className="text-right shrink-0">
                {stats.total > 0 ? (
                  <div className="text-[10px] text-muted-foreground space-y-0.5">
                    <p>{stats.completed}/{stats.total} done</p>
                    {stats.overdue > 0 && <p className="text-destructive font-medium">{stats.overdue} overdue</p>}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground">Not assigned</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Assignment Sheet for selected document */}
      {selectedDoc && (
        <AssignDocumentDialog
          document={selectedDoc}
          open={!!selectedDoc}
          onOpenChange={open => !open && setSelectedDoc(null)}
        />
      )}
    </div>
  );
}

// ─── Add Document Dialog ───

function AddDocumentDialog() {
  const [open, setOpen] = useState(false);
  const createItem = useCreateLibraryItem();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "training",
    content_type: "document" as "document" | "internal_page" | "external_link",
    content_url: "",
    requires_acknowledgement: false,
    requires_completion: false,
    requires_quiz: false,
    counts_toward_readiness: false,
    effective_date: "",
    expiry_date: "",
  });

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    createItem.mutate({
      title: form.title,
      description: form.description || null,
      category: form.category,
      content_type: form.content_type,
      content_url: form.content_url || null,
      requires_acknowledgement: form.requires_acknowledgement,
      requires_completion: form.requires_completion,
      requires_quiz: form.requires_quiz,
      counts_toward_readiness: form.counts_toward_readiness,
      effective_date: form.effective_date || null,
      expiry_date: form.expiry_date || null,
    } as any, {
      onSuccess: () => {
        setOpen(false);
        setForm({ title: "", description: "", category: "training", content_type: "document", content_url: "", requires_acknowledgement: false, requires_completion: false, requires_quiz: false, counts_toward_readiness: false, effective_date: "", expiry_date: "" });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Document
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add to Library</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Allergen Awareness Guide" /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description..." rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LIBRARY_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Content Type</Label>
              <Select value={form.content_type} onValueChange={v => setForm(f => ({ ...f, content_type: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="internal_page">Internal Page</SelectItem>
                  <SelectItem value="external_link">External Link</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.content_type !== "document" && (
            <div>
              <Label>{form.content_type === "internal_page" ? "Page Route" : "URL"}</Label>
              <Input
                value={form.content_url}
                onChange={e => setForm(f => ({ ...f, content_url: e.target.value }))}
                placeholder={form.content_type === "internal_page" ? "/foh/service" : "https://..."}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Effective Date</Label><Input type="date" value={form.effective_date} onChange={e => setForm(f => ({ ...f, effective_date: e.target.value }))} /></div>
            <div><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} /></div>
          </div>
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div><p className="text-xs font-medium">Requires Acknowledgement</p><p className="text-[10px] text-muted-foreground">Staff must confirm they've read it</p></div>
              <Switch checked={form.requires_acknowledgement} onCheckedChange={v => setForm(f => ({ ...f, requires_acknowledgement: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-xs font-medium">Requires Completion</p><p className="text-[10px] text-muted-foreground">Must be marked as completed</p></div>
              <Switch checked={form.requires_completion} onCheckedChange={v => setForm(f => ({ ...f, requires_completion: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-xs font-medium">Requires Quiz</p><p className="text-[10px] text-muted-foreground">Must pass knowledge check</p></div>
              <Switch checked={form.requires_quiz} onCheckedChange={v => setForm(f => ({ ...f, requires_quiz: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-xs font-medium">Counts Toward Readiness</p><p className="text-[10px] text-muted-foreground">Blocks work readiness if incomplete</p></div>
              <Switch checked={form.counts_toward_readiness} onCheckedChange={v => setForm(f => ({ ...f, counts_toward_readiness: v }))} />
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={createItem.isPending} className="w-full">
            {createItem.isPending ? "Adding..." : "Add to Library"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Assign Document Dialog ───

function AssignDocumentDialog({ document, open, onOpenChange }: {
  document: TrainingLibraryItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: employees = [] } = useEmployees();
  const { data: existingAssignments = [] } = useTrainingAssignments({ documentId: document.id });
  const createAssignments = useCreateAssignments();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dueDate, setDueDate] = useState("");
  const [assignFilter, setAssignFilter] = useState("all");

  const activeEmployees = employees.filter(e => e.status === "active" || e.status === "starter" || (e.status as string) === "onboarding");
  const assignedEmployeeIds = new Set(existingAssignments.map(a => a.employee_id));

  const filteredEmployees = activeEmployees.filter(e => {
    if (assignedEmployeeIds.has(e.id)) return false;
    if (assignFilter === "all") return true;
    return e.department === assignFilter;
  });

  const toggleEmployee = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedIds(newSet);
  };

  const selectAll = () => setSelectedIds(new Set(filteredEmployees.map(e => e.id)));

  const handleAssign = () => {
    if (selectedIds.size === 0) return;
    createAssignments.mutate(
      Array.from(selectedIds).map(empId => ({
        document_id: document.id,
        employee_id: empId,
        due_date: dueDate || undefined,
      })),
      { onSuccess: () => { setSelectedIds(new Set()); onOpenChange(false); } }
    );
  };

  const catLabel = LIBRARY_CATEGORIES.find(c => c.value === document.category)?.label || document.category;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">{document.title}</DialogTitle>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-[10px]">{catLabel}</Badge>
            {document.requires_acknowledgement && <Badge className="text-[10px] bg-warning/10 text-warning">Acknowledgement</Badge>}
            {document.requires_quiz && <Badge className="text-[10px] bg-accent/10 text-accent">Quiz</Badge>}
          </div>
        </DialogHeader>

        <Tabs defaultValue="assign" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="assign">Assign</TabsTrigger>
            <TabsTrigger value="tracking">Tracking ({existingAssignments.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="assign" className="flex-1 overflow-y-auto space-y-3 mt-3">
            <div className="flex gap-2">
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-8 w-[160px]" placeholder="Due date" />
              <Button variant="outline" size="sm" onClick={selectAll} className="text-xs h-8">Select All</Button>
            </div>
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {filteredEmployees.map(emp => (
                <label
                  key={emp.id}
                  className={cn(
                    "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors",
                    selectedIds.has(emp.id) ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/50"
                  )}
                >
                  <input type="checkbox" checked={selectedIds.has(emp.id)} onChange={() => toggleEmployee(emp.id)} className="rounded" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{emp.forename} {emp.surname}</p>
                    <p className="text-[10px] text-muted-foreground">{emp.department}</p>
                  </div>
                </label>
              ))}
              {filteredEmployees.length === 0 && (
                <p className="text-center py-6 text-sm text-muted-foreground">All employees already assigned</p>
              )}
            </div>
            {selectedIds.size > 0 && (
              <Button onClick={handleAssign} disabled={createAssignments.isPending} className="w-full">
                {createAssignments.isPending ? "Assigning..." : `Assign to ${selectedIds.size} employee${selectedIds.size > 1 ? "s" : ""}`}
              </Button>
            )}
          </TabsContent>

          <TabsContent value="tracking" className="flex-1 overflow-y-auto mt-3">
            <div className="space-y-1.5">
              {existingAssignments.length === 0 && (
                <p className="text-center py-6 text-sm text-muted-foreground">No assignments yet</p>
              )}
              {existingAssignments.map(a => {
                const isOverdue = a.due_date && differenceInDays(new Date(), parseISO(a.due_date)) > 0 && a.status === "assigned";
                return (
                  <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {a.employees?.forename} {a.employees?.surname}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {a.employees?.department}
                        {a.due_date && ` · Due ${format(parseISO(a.due_date), "d MMM")}`}
                      </p>
                    </div>
                    <AssignmentStatusBadge status={a.status} isOverdue={!!isOverdue} />
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ─── Completion Tracking Dashboard ───

export function TrainingCompletionDashboard({ highlightEmployeeId, highlightModuleId }: { highlightEmployeeId?: string; highlightModuleId?: string } = {}) {
  const { data: assignments = [], isLoading, isFetching } = useTrainingAssignments();
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const highlightRef = useRef<HTMLDivElement>(null);
  const hasScrolled = useRef(false);
  const [hasRefreshed, setHasRefreshed] = useState(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const highlightKey = highlightEmployeeId && highlightModuleId
    ? `${highlightEmployeeId}::${highlightModuleId}` : null;

  // Unscoped existence check — queries DB directly to see if assignment exists at all
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

  // When deep-linked, force filter to "all" so the row isn't hidden
  useEffect(() => {
    if (highlightKey) {
      setStatusFilter("all");
      hasScrolled.current = false;
      setHasRefreshed(false);
    }
  }, [highlightKey]);

  // Check if match exists in the scoped assignment list
  const matchInScope = highlightKey
    ? assignments.some(a => `${a.employee_id}::${a.document_id}` === highlightKey)
    : false;

  // Scroll into view once data loads and match is found
  useEffect(() => {
    if (highlightKey && matchInScope && highlightRef.current && !hasScrolled.current) {
      hasScrolled.current = true;
      const t = setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
      return () => clearTimeout(t);
    }
  }, [highlightKey, matchInScope, assignments]);

  // Determine no-match state from real data
  type NoMatchState = "loading" | "not_found" | "scope_restricted" | null;
  let noMatchState: NoMatchState = null;
  if (highlightKey && !matchInScope) {
    if (isLoading || isFetching || isManualRefreshing || existenceLoading) {
      noMatchState = "loading";
    } else if (existsInDb) {
      // Exists in DB but not in scoped results → manager scope restriction
      noMatchState = "scope_restricted";
    } else {
      // Doesn't exist in DB at all
      noMatchState = "not_found";
    }
  }

  const handleRefresh = useCallback(async () => {
    setIsManualRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["training_assignments"] });
    // Wait for refetch to settle
    await queryClient.refetchQueries({ queryKey: ["training_assignments"] });
    setIsManualRefreshing(false);
    setHasRefreshed(true);
  }, [queryClient]);

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

  // When deep-linked, bring matching assignment to top
  if (highlightKey) {
    filtered = [...filtered].sort((a, b) => {
      const aMatch = `${a.employee_id}::${a.document_id}` === highlightKey ? 0 : 1;
      const bMatch = `${b.employee_id}::${b.document_id}` === highlightKey ? 0 : 1;
      return aMatch - bMatch;
    });
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">Assignment Tracking</h2>

      {/* Status chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
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
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap shrink-0",
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

      {/* Deep-link status banners */}
      {noMatchState === "loading" && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-center gap-2">
          <Loader2 className="h-4 w-4 text-muted-foreground animate-spin flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Loading assignment data…
          </p>
        </div>
      )}

      {noMatchState === "not_found" && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-warning font-medium">Assignment not found</p>
            <p className="text-[11px] text-warning/80 mt-0.5">
              {hasRefreshed
                ? "This assignment does not exist yet. It may need to be created from the Gaps tab first."
                : "This assignment may not have been created yet. Try refreshing to check for recent changes."}
            </p>
          </div>
          {!hasRefreshed && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 h-7 text-xs gap-1.5 border-warning/30 text-warning hover:bg-warning/10"
              onClick={handleRefresh}
              disabled={isManualRefreshing}
            >
              <RefreshCw className={cn("h-3 w-3", isManualRefreshing && "animate-spin")} />
              Refresh
            </Button>
          )}
        </div>
      )}

      {noMatchState === "scope_restricted" && (
        <div className="rounded-lg border border-muted-foreground/20 bg-muted/30 p-3 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium">Assignment not visible</p>
            <p className="text-[11px] text-muted-foreground/80 mt-0.5">
              {hasRefreshed
                ? "This assignment is outside your branch scope, or it hasn't been created yet."
                : "This employee may be outside your branch scope. Try refreshing to check for recent changes."}
            </p>
          </div>
          {!hasRefreshed && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 h-7 text-xs gap-1.5"
              onClick={handleRefresh}
              disabled={isManualRefreshing}
            >
              <RefreshCw className={cn("h-3 w-3", isManualRefreshing && "animate-spin")} />
              Refresh
            </Button>
          )}
        </div>
      )}

      {/* Assignment list */}
      <div className="space-y-1.5">
        {filtered.length === 0 && !highlightKey && (
          <div className="text-center py-8">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No assignments match this filter</p>
          </div>
        )}
        {filtered.slice(0, 50).map(a => {
          const doc = a.training_library;
          const isOverdue = a.due_date && differenceInDays(new Date(), parseISO(a.due_date)) > 0 && !["completed", "acknowledged", "cancelled"].includes(a.status);
          const isMatch = `${a.employee_id}::${a.document_id}` === highlightKey;
          return (
            <div
              key={a.id}
              ref={isMatch ? highlightRef : undefined}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl bg-card border shadow-sm transition-all",
                isMatch
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border"
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {a.employees?.forename} {a.employees?.surname}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {doc?.title || "Unknown document"}
                  {a.due_date && ` · Due ${format(parseISO(a.due_date), "d MMM")}`}
                </p>
              </div>
              <AssignmentStatusBadge status={a.status} isOverdue={!!isOverdue} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Status Badge ───

function AssignmentStatusBadge({ status, isOverdue }: { status: string; isOverdue: boolean }) {
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
