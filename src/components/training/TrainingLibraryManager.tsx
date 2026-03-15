import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  BookOpen, Plus, FileText, Shield, GraduationCap, AlertTriangle,
  CheckCircle2, Clock, Search, Sparkles, Eye, Users, MoreVertical,
  ThumbsUp, Send, Archive, Download, AlertCircle,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  useTrainingLibrary,
  useCreateLibraryItem,
  useUpdateLibraryItem,
  useTrainingAssignments,
  useCreateAssignments,
  LIBRARY_CATEGORIES,
  type TrainingLibraryItem,
  type TrainingCompletionType,
  type AssignmentSource,
} from "@/hooks/useTrainingLibrary";
import { useUpdateModuleStatus, COMPLETION_TYPES, MODULE_STATUSES, AUDIENCE_SCOPES, type ModuleStatus } from "@/hooks/useTrainingModules";
import { useEmployees } from "@/hooks/useEmployees";
import { AssignmentStatusBadge } from "@/components/training/AssignmentStatusBadge";
import { QuizBuilder } from "@/components/training/QuizBuilder";
import { useTenant } from "@/hooks/useTenant";
import { usePermission } from "@/hooks/useRolePermissions";
import { exportToCsv } from "@/lib/csv-export";
import { writeTrainingAudit } from "@/hooks/useTrainingLibrary";
import { toast } from "sonner";
import { WhyThisMattersPanel } from "@/components/training/WhyThisMattersPanel";
import { EvidencePanel } from "@/components/training/EvidencePanel";
import { ReviewInsightsPanel } from "@/components/training/ReviewInsightsPanel";
import { EvidenceCompletenessBar } from "@/components/training/EvidenceCompletenessBar";
import { ModuleGovernanceSummary } from "@/components/training/ModuleGovernanceSummary";
import { OPERATIONAL_AREA_LABELS, type OperationalArea, type StandardsMetadata } from "@/data/training-standards/types";
import {
  COMPLETENESS_LABELS,
  deriveEvidenceCompleteness,
  useModuleEvidence,
  type EvidenceCompletenessStatus,
} from "@/hooks/useModuleEvidence";
import { useGovernanceSummary } from "@/hooks/useGovernanceSummary";
import { useReviewInsights } from "@/hooks/useReviewInsights";
import { getReviewState } from "@/lib/review-governance";
import {
  classifyGovernance, computeGovernanceMetrics, getGovernanceReasons,
  getGovernanceRecommendation, GOVERNANCE_HEALTH_CONFIG,
  type GovernanceHealth, type ModuleGovernanceInput,
} from "@/lib/governance-classification";
import { GovernanceDashboard } from "@/components/training/GovernanceDashboard";
import { ContentStrengthPanel } from "@/components/training/ContentStrengthPanel";
import { EffectivenessSection } from "@/components/training/EffectivenessSection";
import { ModuleEffectivenessPanel } from "@/components/training/ModuleEffectivenessPanel";
import { SignalQualitySection } from "@/components/training/SignalQualitySection";
import { ModuleSignalQualityPanel } from "@/components/training/ModuleSignalQualityPanel";
import { useTrainingEffectiveness } from "@/hooks/useTrainingEffectiveness";
import { useSignalQuality } from "@/hooks/useSignalQuality";
import type { ServiceRiskLevel, ReviewInsightTag } from "@/data/training-standards/types";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TrainingLibraryManager() {
  const { data: library = [] } = useTrainingLibrary();
  const { data: assignments = [] } = useTrainingAssignments();
  const updateStatus = useUpdateModuleStatus();
  const canManage = usePermission("manage_training");
  const { tenantId } = useTenant();
  const { data: govCounts = {} } = useGovernanceSummary(canManage);
  const { metrics: effMetrics, latestByModule: effByModule, records: effRecords } = useTrainingEffectiveness(canManage);
  const { metrics: sqMetrics, qualityByModule: sqByModule } = useSignalQuality(canManage, govCounts);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [opAreaFilter, setOpAreaFilter] = useState("all");
  const [mandatoryFilter, setMandatoryFilter] = useState(false);
  const [evidenceFilter, setEvidenceFilter] = useState("all");
  const [selectedDoc, setSelectedDoc] = useState<TrainingLibraryItem | null>(null);

  // Only show tenant modules + adapted in main library
  const tenantModules = library.filter(i => i.tenant_id !== null || i.source_type === "adapted");

  // Governance metrics (admin-only, computed once)
  const govMetrics = canManage ? computeGovernanceMetrics(tenantModules, govCounts) : null;

  // Helper: classify a single module for filtering
  const getModuleHealth = (item: TrainingLibraryItem): GovernanceHealth => {
    const counts = govCounts[item.id] ?? { evidenceCount: 0, insightCount: 0 };
    return classifyGovernance({
      lastReviewedAt: item.last_reviewed_at ?? null,
      counts,
      isMandatory: item.is_mandatory,
      serviceRiskLevel: (item.standards_metadata as any)?.service_risk_level,
    });
  };

  const filtered = tenantModules.filter(item => {
    const matchesSearch = !searchQuery || item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = categoryFilter === "all" || item.category === categoryFilter;
    const matchesSource = sourceFilter === "all" || item.source_type === sourceFilter;
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const matchesOpArea = opAreaFilter === "all" || (item.standards_metadata as any)?.operational_area === opAreaFilter;
    const matchesMandatory = !mandatoryFilter || item.is_mandatory;

    // Evidence / governance filters
    let matchesEvidence = true;
    if (evidenceFilter !== "all") {
      const counts = govCounts[item.id] ?? { evidenceCount: 0, insightCount: 0 };
      const health = getModuleHealth(item);
      switch (evidenceFilter) {
        case "reviewed": matchesEvidence = !!item.last_reviewed_at && getReviewState(item.last_reviewed_at) === "current"; break;
        case "not_reviewed": matchesEvidence = !item.last_reviewed_at; break;
        case "stale": matchesEvidence = getReviewState(item.last_reviewed_at ?? null) === "stale"; break;
        case "has_evidence": matchesEvidence = counts.evidenceCount > 0; break;
        case "no_evidence": matchesEvidence = counts.evidenceCount === 0; break;
        case "has_insights": matchesEvidence = counts.insightCount > 0; break;
        case "no_insights": matchesEvidence = counts.insightCount === 0; break;
        // Governance dashboard filters
        case "gov_ready": matchesEvidence = health === "ready"; break;
        case "gov_weak": matchesEvidence = health === "weak"; break;
        case "gov_partial": matchesEvidence = health === "partial"; break;
        case "gov_mandatory_weak": matchesEvidence = item.is_mandatory && (health === "weak" || health === "unreviewed"); break;
        case "gov_high_risk": matchesEvidence = (item.standards_metadata as any)?.service_risk_level === "high" && health !== "ready"; break;
        // Content gap filters
        case "no_scenarios": {
          const meta = item.standards_metadata as any;
          matchesEvidence = !meta?.scenario_examples || meta.scenario_examples.length === 0;
          break;
        }
        case "no_learning_outcomes": {
          const meta2 = item.standards_metadata as any;
          matchesEvidence = !meta2?.learning_outcomes || meta2.learning_outcomes.length === 0;
          break;
        }
        // Effectiveness filters
        case "eff_strong": {
          const effRec = effByModule.get(item.id);
          matchesEvidence = !!effRec && effRec.delta_percent <= -40;
          break;
        }
        case "eff_improved": {
          const effRec = effByModule.get(item.id);
          matchesEvidence = !!effRec && effRec.delta_percent < -15 && effRec.delta_percent > -40;
          break;
        }
        case "eff_unchanged": {
          const effRec = effByModule.get(item.id);
          matchesEvidence = !!effRec && effRec.delta_percent >= -15 && effRec.delta_percent <= 15;
          break;
        }
        case "eff_declined": {
          const effRec = effByModule.get(item.id);
          matchesEvidence = !!effRec && effRec.delta_percent > 15;
          break;
        }
        case "eff_insufficient": {
          const effRec = effByModule.get(item.id);
          matchesEvidence = !!effRec && effRec.result_status === "insufficient_data";
          break;
        }
        default: matchesEvidence = true;
      }
    }
    return matchesSearch && matchesCat && matchesSource && matchesStatus && matchesOpArea && matchesMandatory && matchesEvidence;
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

  const getStatusBadge = (status: string) => {
    const s = MODULE_STATUSES.find(ms => ms.value === status);
    return <Badge className={cn("text-[10px]", s?.color || "bg-muted text-muted-foreground")}>{s?.label || status}</Badge>;
  };

  const getSourceBadge = (sourceType: string) => {
    if (sourceType === "platform") return <Badge className="text-[10px] bg-primary/10 text-primary">UGLŌ</Badge>;
    if (sourceType === "adapted") return <Badge className="text-[10px] bg-accent/10 text-accent-foreground">Adapted</Badge>;
    return null;
  };

  const handleStatusChange = (id: string, status: ModuleStatus) => {
    updateStatus.mutate({ id, status });
  };

  // Status counts
  const statusCounts = {
    all: tenantModules.length,
    draft: tenantModules.filter(m => m.status === "draft").length,
    under_review: tenantModules.filter(m => m.status === "under_review").length,
    approved: tenantModules.filter(m => m.status === "approved").length,
    published: tenantModules.filter(m => m.status === "published").length,
    archived: tenantModules.filter(m => m.status === "archived").length,
  };

  const handleExportModules = () => {
    exportToCsv("training-library", [
      { header: "Title", accessor: (m: TrainingLibraryItem) => m.title },
      { header: "Category", accessor: (m: TrainingLibraryItem) => LIBRARY_CATEGORIES.find(c => c.value === m.category)?.label || m.category },
      { header: "Status", accessor: (m: TrainingLibraryItem) => m.status },
      { header: "Source", accessor: (m: TrainingLibraryItem) => m.source_type },
      { header: "Type", accessor: (m: TrainingLibraryItem) => m.completion_type },
      { header: "Version", accessor: (m: TrainingLibraryItem) => m.version },
      { header: "Mandatory", accessor: (m: TrainingLibraryItem) => m.is_mandatory ? "Yes" : "No" },
      { header: "Refresher Days", accessor: (m: TrainingLibraryItem) => m.refresher_days ?? "" },
    ], filtered);
    toast.success("Library exported");
    if (tenantId) writeTrainingAudit({ tenant_id: tenantId, action: "csv_exported", metadata: { type: "training_library", count: filtered.length } });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-foreground">Training Library</h2>
          <p className="text-xs text-muted-foreground">{filtered.length} module{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {canManage && filtered.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExportModules} className="gap-1.5 text-xs hidden sm:flex">
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          )}
          {canManage && <AddModuleDialog />}
        </div>
      </div>

      {/* Admin governance dashboard */}
      {canManage && govMetrics && govMetrics.total > 0 && (
        <GovernanceDashboard
          metrics={govMetrics}
          activeFilter={evidenceFilter}
          onFilterSelect={setEvidenceFilter}
          modules={tenantModules}
          govCounts={govCounts}
          onModuleOpen={(id) => {
            const mod = tenantModules.find(m => m.id === id);
            if (mod) setSelectedDoc(mod);
          }}
        />
      )}

      {/* Admin effectiveness dashboard */}
      {canManage && (
        <EffectivenessSection
          metrics={effMetrics}
          activeFilter={evidenceFilter}
          onFilterSelect={setEvidenceFilter}
        />
      )}

      {/* Admin signal quality dashboard */}
      {canManage && (
        <SignalQualitySection
          metrics={sqMetrics}
          activeFilter={evidenceFilter}
          onFilterSelect={setEvidenceFilter}
        />
      )}

      {/* Search + Category */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search modules..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 h-9" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {LIBRARY_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Status chips with counts */}
        <div className="flex gap-1.5 flex-wrap">
          {[
            { key: "all", label: "All", count: statusCounts.all },
            { key: "draft", label: "Draft", count: statusCounts.draft },
            { key: "under_review", label: "Review", count: statusCounts.under_review },
            { key: "approved", label: "Approved", count: statusCounts.approved },
            { key: "published", label: "Published", count: statusCounts.published },
            { key: "archived", label: "Archived", count: statusCounts.archived },
          ].filter(s => s.key === "all" || s.count > 0).map(s => (
            <button key={s.key} onClick={() => setStatusFilter(s.key)}
              className={cn("px-3 py-1 rounded-full text-xs font-medium border transition-all",
                statusFilter === s.key ? "bg-primary/10 text-primary border-primary/20" : "bg-card text-muted-foreground border-border"
              )}>
              {s.label}
              {s.count > 0 && <span className="ml-1 tabular-nums font-bold">{s.count}</span>}
            </button>
          ))}

          {/* Source filter */}
          <div className="ml-auto flex gap-1.5 items-center">
            <Select value={opAreaFilter} onValueChange={setOpAreaFilter}>
              <SelectTrigger className="h-7 w-[100px] text-xs"><SelectValue placeholder="Area" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Areas</SelectItem>
                {(Object.entries(OPERATIONAL_AREA_LABELS) as [OperationalArea, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="h-7 w-[100px] text-xs"><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="tenant">Tenant</SelectItem>
                <SelectItem value="adapted">Adapted</SelectItem>
              </SelectContent>
            </Select>
            <button
              onClick={() => setMandatoryFilter(!mandatoryFilter)}
              className={cn("px-2 py-1 rounded-full text-[10px] font-medium border transition-all whitespace-nowrap",
                mandatoryFilter ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-card text-muted-foreground border-border"
              )}>
              Mandatory
            </button>
            {canManage && (
              <Select value={evidenceFilter} onValueChange={setEvidenceFilter}>
                <SelectTrigger className="h-7 w-[110px] text-xs"><SelectValue placeholder="Evidence" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Governance</SelectItem>
                  <SelectItem value="gov_ready">Ready</SelectItem>
                  <SelectItem value="gov_partial">Partial</SelectItem>
                  <SelectItem value="gov_weak">Weak</SelectItem>
                  <SelectItem value="not_reviewed">Unreviewed</SelectItem>
                  <SelectItem value="stale">Stale</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="has_evidence">Has Evidence</SelectItem>
                  <SelectItem value="no_evidence">No Evidence</SelectItem>
                  <SelectItem value="has_insights">Has Insights</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      {/* Module List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <h3 className="text-sm font-semibold text-foreground mb-1">
              {tenantModules.length === 0 ? "No training modules yet" : "No modules match your filters"}
            </h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              {tenantModules.length === 0
                ? "Upload your first SOP, create a new module, or adapt one from the UGLŌ standard library."
                : "Try adjusting your search or status filters."}
            </p>
          </div>
        )}
        {filtered.map(item => {
          const stats = getAssignmentStats(item.id);
          const catLabel = LIBRARY_CATEGORIES.find(c => c.value === item.category)?.label || item.category;
          const isPlatform = item.source_type === "platform";
          const itemGov = canManage ? govCounts[item.id] : undefined;
          const reviewState = canManage ? getReviewState(item.last_reviewed_at ?? null) : undefined;
          const riskLevel = (item.standards_metadata as any)?.service_risk_level as string | undefined;
          const moduleHealth = canManage ? getModuleHealth(item) : undefined;
          return (
            <div key={item.id}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border shadow-sm cursor-pointer active:bg-muted transition-all"
              onClick={() => setSelectedDoc(item)}
            >
              <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                item.completion_type === "quiz" ? "bg-accent/10" :
                item.completion_type === "practical_signoff" ? "bg-warning/10" :
                item.completion_type === "blended" ? "bg-primary/10" : "bg-muted"
              )}>
                {item.completion_type === "quiz" ? <GraduationCap className="h-5 w-5 text-accent-foreground" /> :
                 item.completion_type === "practical_signoff" ? <Shield className="h-5 w-5 text-warning" /> :
                 item.completion_type === "blended" ? <Sparkles className="h-5 w-5 text-primary" /> :
                 <FileText className="h-5 w-5 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {getStatusBadge(item.status)}
                  {getSourceBadge(item.source_type)}
                  <Badge variant="outline" className="text-[10px]">{catLabel}</Badge>
                  {item.is_mandatory && <Badge className="text-[10px] bg-destructive/10 text-destructive">Mandatory</Badge>}
                  {item.version > 1 && <Badge variant="secondary" className="text-[10px]">v{item.version}</Badge>}
                  {/* Admin governance indicators */}
                  {canManage && reviewState === "current" && (
                    <Badge variant="outline" className="text-[9px] text-success gap-0.5">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Reviewed
                    </Badge>
                  )}
                  {canManage && reviewState === "stale" && (
                    <Badge className="text-[9px] bg-warning/10 text-warning gap-0.5">
                      <AlertTriangle className="h-2.5 w-2.5" /> Stale
                    </Badge>
                  )}
                  {canManage && itemGov && itemGov.evidenceCount > 0 && (
                    <Badge variant="outline" className="text-[9px] text-muted-foreground gap-0.5">
                      <BookOpen className="h-2.5 w-2.5" /> {itemGov.evidenceCount}
                    </Badge>
                  )}
                  {canManage && itemGov && itemGov.insightCount > 0 && (
                    <Badge variant="outline" className="text-[9px] text-muted-foreground gap-0.5">
                      <Eye className="h-2.5 w-2.5" /> {itemGov.insightCount}
                    </Badge>
                  )}
                  {/* High-risk badge */}
                  {canManage && riskLevel === "high" && moduleHealth !== "ready" && (
                    <Badge className="text-[9px] bg-destructive/10 text-destructive gap-0.5">
                      <AlertTriangle className="h-2.5 w-2.5" /> High Risk
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0 flex items-center gap-2">
                {stats.total > 0 ? (
                  <div className="text-[10px] text-muted-foreground space-y-0.5">
                    <p>{stats.completed}/{stats.total} done</p>
                    {stats.overdue > 0 && <p className="text-destructive font-medium">{stats.overdue} overdue</p>}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground">Not assigned</p>
                )}
                {canManage && !isPlatform && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                      {item.status === "draft" && (
                        <DropdownMenuItem onClick={() => handleStatusChange(item.id, "approved")}>
                          <ThumbsUp className="h-4 w-4 mr-2" /> Approve
                        </DropdownMenuItem>
                      )}
                      {(item.status === "approved" || item.status === "draft") && (
                        <DropdownMenuItem onClick={() => handleStatusChange(item.id, "published")}>
                          <Send className="h-4 w-4 mr-2" /> Publish
                        </DropdownMenuItem>
                      )}
                      {item.status === "published" && (
                        <DropdownMenuItem onClick={() => handleStatusChange(item.id, "archived")}>
                          <Archive className="h-4 w-4 mr-2" /> Archive
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Module Detail Sheet */}
      {selectedDoc && (
        <ModuleDetailSheet
          module={selectedDoc}
          open={!!selectedDoc}
          onOpenChange={open => !open && setSelectedDoc(null)}
        />
      )}
    </div>
  );
}

// ─── Module Detail Sheet ───

function ModuleDetailSheet({ module, open, onOpenChange }: {
  module: TrainingLibraryItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: employees = [] } = useEmployees();
  const { data: existingAssignments = [] } = useTrainingAssignments({ documentId: module.id });
  const createAssignments = useCreateAssignments();
  const updateStatus = useUpdateModuleStatus();
  const updateItem = useUpdateLibraryItem();
  const canManage = usePermission("manage_training");
  const { data: detailGovCounts = {} } = useGovernanceSummary(canManage);
  const isPlatform = module.source_type === "platform" && module.tenant_id === null;
  const isArchived = module.status === "archived";
  const canEdit = canManage && !isPlatform && !isArchived;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dueDate, setDueDate] = useState("");
  const [detailTab, setDetailTab] = useState("info");
  const [assignMode, setAssignMode] = useState<"individual" | "department" | "all">("individual");
  const [selectedDept, setSelectedDept] = useState("all");
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    title: module.title,
    summary: module.summary || "",
    description: module.description || "",
    category: module.category,
    completion_type: module.completion_type,
    audience_scope: module.audience_scope || "all_staff",
    is_mandatory: module.is_mandatory,
    estimated_minutes: module.estimated_minutes ? String(module.estimated_minutes) : "",
    refresher_days: module.refresher_days ? String(module.refresher_days) : "",
    pass_mark: String(module.pass_mark || 80),
  });

  const [showPublishWarning, setShowPublishWarning] = useState(false);

  const isCriticalChange = module.status === "published" && editMode && (
    editForm.completion_type !== module.completion_type ||
    editForm.pass_mark !== String(module.pass_mark || 80) ||
    editForm.is_mandatory !== module.is_mandatory
  );

  const handleSaveEdit = () => {
    if (module.status === "published" && !showPublishWarning) {
      setShowPublishWarning(true);
      return;
    }
    const changedFields = Object.keys(editForm).filter(k => {
      const orig = k === "estimated_minutes" ? (module.estimated_minutes ? String(module.estimated_minutes) : "") :
        k === "refresher_days" ? (module.refresher_days ? String(module.refresher_days) : "") :
        k === "pass_mark" ? String(module.pass_mark || 80) :
        k === "summary" ? (module.summary || "") :
        k === "description" ? (module.description || "") :
        k === "audience_scope" ? (module.audience_scope || "all_staff") :
        (module as unknown as Record<string, unknown>)[k];
      return (editForm as Record<string, unknown>)[k] !== orig;
    });

    updateItem.mutate({
      id: module.id,
      updates: {
        title: editForm.title,
        summary: editForm.summary || null,
        description: editForm.description || null,
        category: editForm.category,
        completion_type: editForm.completion_type,
        audience_scope: editForm.audience_scope,
        is_mandatory: editForm.is_mandatory,
        estimated_minutes: editForm.estimated_minutes ? parseInt(editForm.estimated_minutes) : null,
        refresher_days: editForm.refresher_days ? parseInt(editForm.refresher_days) : null,
        pass_mark: parseInt(editForm.pass_mark) || 80,
        requires_quiz: editForm.completion_type === "quiz" || editForm.completion_type === "blended",
      },
      changeSummary: `Fields changed: ${changedFields.join(", ") || "none"}`,
    }, {
      onSuccess: () => {
        setEditMode(false);
        setShowPublishWarning(false);
        onOpenChange(false);
      },
    });
  };

  const activeEmployees = employees.filter(e => e.status === "active" || e.status === "starter" || (e.status as string) === "onboarding");
  const assignedEmployeeIds = new Set(existingAssignments.map(a => a.employee_id));
  const unassignedEmployees = activeEmployees.filter(e => !assignedEmployeeIds.has(e.id));
  const departments = Array.from(new Set(activeEmployees.map(e => e.department).filter(Boolean)));

  const filteredUnassigned = assignMode === "department" && selectedDept !== "all"
    ? unassignedEmployees.filter(e => e.department === selectedDept)
    : unassignedEmployees;

  const toggleEmployee = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredUnassigned.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredUnassigned.map(e => e.id)));
    }
  };

  const [showAssignConfirm, setShowAssignConfirm] = useState(false);

  const getAssignTargetCount = () => {
    if (assignMode === "all") return unassignedEmployees.length;
    if (assignMode === "department") return filteredUnassigned.length;
    return selectedIds.size;
  };

  const getAssignSourceLabel = (): string => {
    if (assignMode === "all") return "All Staff";
    if (assignMode === "department") return `Department: ${selectedDept}`;
    return "Individual";
  };

  const handleAssign = () => {
    const targetIds = assignMode === "all" ? unassignedEmployees.map(e => e.id) :
      assignMode === "department" ? filteredUnassigned.map(e => e.id) :
      Array.from(selectedIds);
    if (targetIds.length === 0) return;
    setShowAssignConfirm(false);
    createAssignments.mutate(
      {
        assignments: targetIds.map(empId => ({
          document_id: module.id,
          employee_id: empId,
          due_date: dueDate || undefined,
          is_mandatory: module.is_mandatory,
          signoff_required: module.completion_type === "practical_signoff" || module.completion_type === "blended",
        })),
        assignmentSource: (assignMode === "all" ? "all_staff" : assignMode === "department" ? "department" : "direct") as AssignmentSource,
      },
      { onSuccess: () => { setSelectedIds(new Set()); } }
    );
  };

  const catLabel = LIBRARY_CATEGORIES.find(c => c.value === module.category)?.label || module.category;
  const compLabel = COMPLETION_TYPES.find(c => c.value === module.completion_type)?.label || module.completion_type;

  const handleExportAssignments = () => {
    exportToCsv(`assignments-${module.title.replace(/\s+/g, "-").toLowerCase()}`, [
      { header: "Employee", accessor: (a: any) => `${a.employees?.forename} ${a.employees?.surname}` },
      { header: "Department", accessor: (a: any) => a.employees?.department },
      { header: "Status", accessor: (a: any) => a.status },
      { header: "Due Date", accessor: (a: any) => a.due_date ? format(parseISO(a.due_date), "dd/MM/yyyy") : "" },
      { header: "Completed", accessor: (a: any) => a.completed_at ? format(parseISO(a.completed_at), "dd/MM/yyyy") : "" },
      { header: "Score", accessor: (a: any) => a.score ?? "" },
    ], existingAssignments);
    toast.success("Assignments exported");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base pr-6">{module.title}</SheetTitle>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            {MODULE_STATUSES.find(s => s.value === module.status) && (
              <Badge className={cn("text-[10px]", MODULE_STATUSES.find(s => s.value === module.status)?.color)}>
                {MODULE_STATUSES.find(s => s.value === module.status)?.label}
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px]">{catLabel}</Badge>
            <Badge variant="outline" className="text-[10px]">{compLabel}</Badge>
            {module.source_type === "adapted" && <Badge className="text-[10px] bg-accent/10 text-accent-foreground">Adapted from UGLŌ</Badge>}
            {isPlatform && <Badge className="text-[10px] bg-primary/10 text-primary">UGLŌ Standard</Badge>}
            {module.version > 1 && <Badge variant="secondary" className="text-[10px]">v{module.version}</Badge>}
          </div>
        </SheetHeader>

        {/* High-risk governance warning */}
        {canManage && (() => {
          const riskLevel = (module.standards_metadata as any)?.service_risk_level as string | undefined;
          if (riskLevel !== "high") return null;
          const counts = detailGovCounts[module.id] ?? { evidenceCount: 0, insightCount: 0 };
          const govInput: ModuleGovernanceInput = {
            lastReviewedAt: module.last_reviewed_at ?? null,
            counts,
            isMandatory: module.is_mandatory,
            serviceRiskLevel: riskLevel as ServiceRiskLevel,
          };
          const health = classifyGovernance(govInput);
          if (health === "ready") return null;
          const reasons = getGovernanceReasons(govInput);
          return (
            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-destructive">
                    High-risk module — governance {GOVERNANCE_HEALTH_CONFIG[health].label.toLowerCase()}
                  </p>
                  <p className="text-[10px] text-destructive/80 mt-0.5">
                    This module can still be published, but governance support is incomplete. Review evidence and insights before relying on it for compliance-sensitive use.
                  </p>
                  <ul className="text-[10px] text-destructive/70 mt-1 space-y-0.5">
                    {reasons.map((r, i) => <li key={i}>• {r}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Approval Actions */}
        {canManage && !isPlatform && (
          <div className="flex gap-2 mt-4 flex-wrap">
            {module.status === "draft" && (
              <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: module.id, status: "approved" })} disabled={updateStatus.isPending}>
                <ThumbsUp className="h-4 w-4 mr-1" /> Approve
              </Button>
            )}
            {(module.status === "draft" || module.status === "approved") && (
              <Button size="sm" onClick={() => updateStatus.mutate({ id: module.id, status: "published" })} disabled={updateStatus.isPending}>
                <Send className="h-4 w-4 mr-1" /> Publish
              </Button>
            )}
            {module.status === "published" && (
              <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: module.id, status: "archived" })} disabled={updateStatus.isPending}>
                <Archive className="h-4 w-4 mr-1" /> Archive
              </Button>
            )}
          </div>
        )}

        <Tabs value={detailTab} onValueChange={setDetailTab} className="mt-4">
          <TabsList className={cn("grid w-full", canManage ? "grid-cols-4" : "grid-cols-3")}>
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="assign">Assign ({existingAssignments.length})</TabsTrigger>
            {module.requires_quiz && <TabsTrigger value="quiz">Quiz</TabsTrigger>}
            {canManage && <TabsTrigger value="standards">Standards</TabsTrigger>}
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-3">
            {!editMode ? (
              <>
                {module.summary && <p className="text-sm text-muted-foreground">{module.summary}</p>}
                {module.description && <p className="text-sm text-foreground">{module.description}</p>}
                <div className="space-y-2 text-sm">
                  <InfoRow label="Version" value={`v${module.version}`} />
                  <InfoRow label="Audience" value={module.audience_scope?.replace("_", " ")} />
                  {module.estimated_minutes && <InfoRow label="Est. Time" value={`${module.estimated_minutes} min`} />}
                  {module.refresher_days && (
                    <InfoRow label="Refresher" value={
                      module.refresher_days === 365 ? "Annual" :
                      module.refresher_days === 180 ? "Every 6 months" :
                      `Every ${module.refresher_days} days`
                    } />
                  )}
                  {module.pass_mark && module.requires_quiz && <InfoRow label="Pass Mark" value={`${module.pass_mark}%`} />}
                  {module.is_mandatory && <InfoRow label="Mandatory" value="Yes" />}
                  {module.source_module_id && <InfoRow label="Source" value="Adapted from UGLŌ Standard" />}
                  {module.published_at && <InfoRow label="Published" value={format(parseISO(module.published_at), "d MMM yyyy")} />}
                  {module.review_date && <InfoRow label="Review Due" value={format(parseISO(module.review_date), "d MMM yyyy")} />}
                </div>
                {/* Admin-only evidence completeness */}
                {canManage && (
                  <EvidenceCompletenessBar
                    documentId={module.id}
                    lastReviewedAt={module.last_reviewed_at ?? null}
                    lastReviewedBy={module.last_reviewed_by ?? null}
                    canEdit={canEdit}
                  />
                )}
                {/* Admin-only standards metadata */}
                {canManage && module.standards_metadata && (
                  <WhyThisMattersPanel metadata={module.standards_metadata} />
                )}
                {canEdit && (
                  <Button variant="outline" size="sm" onClick={() => setEditMode(true)} className="w-full mt-2">
                    Edit Module
                  </Button>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <div><Label className="text-xs">Title</Label><Input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} /></div>
                <div><Label className="text-xs">Summary</Label><Input value={editForm.summary} onChange={e => setEditForm(f => ({ ...f, summary: e.target.value }))} /></div>
                <div><Label className="text-xs">Description</Label><Textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Category</Label>
                    <Select value={editForm.category} onValueChange={v => setEditForm(f => ({ ...f, category: v }))}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>{LIBRARY_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Completion Type</Label>
                    <Select value={editForm.completion_type} onValueChange={v => setEditForm(f => ({ ...f, completion_type: v as TrainingCompletionType }))}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>{COMPLETION_TYPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Audience</Label>
                    <Select value={editForm.audience_scope} onValueChange={v => setEditForm(f => ({ ...f, audience_scope: v }))}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>{AUDIENCE_SCOPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Est. Minutes</Label><Input type="number" value={editForm.estimated_minutes} onChange={e => setEditForm(f => ({ ...f, estimated_minutes: e.target.value }))} className="h-8" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Refresher</Label>
                    <Select value={editForm.refresher_days} onValueChange={v => setEditForm(f => ({ ...f, refresher_days: v }))}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No Refresher</SelectItem>
                        <SelectItem value="90">Every 90 Days</SelectItem>
                        <SelectItem value="180">Every 6 Months</SelectItem>
                        <SelectItem value="365">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(editForm.completion_type === "quiz" || editForm.completion_type === "blended") && (
                    <div><Label className="text-xs">Pass Mark (%)</Label><Input type="number" value={editForm.pass_mark} onChange={e => setEditForm(f => ({ ...f, pass_mark: e.target.value }))} className="h-8" /></div>
                  )}
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-xs font-medium">Mandatory</span>
                  <Switch checked={editForm.is_mandatory} onCheckedChange={v => setEditForm(f => ({ ...f, is_mandatory: v }))} />
                </div>
                {/* Published edit warning */}
                {showPublishWarning && (
                  <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-warning">This module is published</p>
                        <p className="text-[11px] text-warning/80">
                          {isCriticalChange
                            ? "You are changing pass mark, completion type, or mandatory status. This may affect staff with active assignments."
                            : "Changes will apply immediately to this published module."}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveEdit} disabled={updateItem.isPending} size="sm" variant={isCriticalChange ? "destructive" : "default"} className="flex-1">
                        {updateItem.isPending ? "Saving..." : "Confirm & Save"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setShowPublishWarning(false)}>Cancel</Button>
                    </div>
                  </div>
                )}
                {!showPublishWarning && (
                  <div className="flex gap-2">
                    <Button onClick={handleSaveEdit} disabled={updateItem.isPending || !editForm.title.trim()} className="flex-1" size="sm">
                      {updateItem.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setEditMode(false); setShowPublishWarning(false); }}>Cancel</Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="assign" className="space-y-3 mt-3">
            {/* Existing assignments */}
            {existingAssignments.length > 0 && (
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Assigned</p>
                  {canManage && (
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={handleExportAssignments}>
                      <Download className="h-3 w-3" /> CSV
                    </Button>
                  )}
                </div>
                {existingAssignments.map(a => {
                  const isOverdue = a.due_date && differenceInDays(new Date(), parseISO(a.due_date)) > 0 && a.status === "assigned";
                  const signoffPending = a.signoff_required && !a.signed_off_at && a.status !== "cancelled";
                  return (
                    <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{a.employees?.forename} {a.employees?.surname}</p>
                        <p className="text-[10px] text-muted-foreground">{a.employees?.department}</p>
                      </div>
                      <AssignmentStatusBadge status={a.status} isOverdue={!!isOverdue} signoffPending={signoffPending} />
                    </div>
                  );
                })}
              </div>
            )}

            {/* New assignments */}
            {module.status === "published" && canManage && (
              <>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Add Assignments</p>

                {/* Assignment mode */}
                <div className="flex gap-1.5 flex-wrap">
                  {(["individual", "department", "all"] as const).map(mode => (
                    <button key={mode} onClick={() => { setAssignMode(mode); setSelectedIds(new Set()); }}
                      className={cn("px-3 py-1 rounded-full text-xs font-medium border transition-all",
                        assignMode === mode ? "bg-primary/10 text-primary border-primary/20" : "bg-card text-muted-foreground border-border"
                      )}>
                      {mode === "individual" ? "Individual" : mode === "department" ? "Department" : "All Staff"}
                    </button>
                  ))}
                </div>

                {/* Department picker */}
                {assignMode === "department" && (
                  <Select value={selectedDept} onValueChange={setSelectedDept}>
                    <SelectTrigger className="h-8"><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}

                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-8" placeholder="Due date (optional)" />

                {assignMode === "individual" && (
                  <>
                    {filteredUnassigned.length > 0 && (
                      <button onClick={selectAll} className="text-[10px] text-primary font-medium">
                        {selectedIds.size === filteredUnassigned.length ? "Deselect all" : "Select all"}
                      </button>
                    )}
                    <div className="space-y-1 max-h-[250px] overflow-y-auto">
                      {filteredUnassigned.map(emp => (
                        <label key={emp.id} className={cn("flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                          selectedIds.has(emp.id) ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/50"
                        )}>
                          <input type="checkbox" checked={selectedIds.has(emp.id)} onChange={() => toggleEmployee(emp.id)} className="rounded" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{emp.forename} {emp.surname}</p>
                            <p className="text-[10px] text-muted-foreground">{emp.department}</p>
                          </div>
                        </label>
                      ))}
                      {filteredUnassigned.length === 0 && <p className="text-center py-4 text-sm text-muted-foreground">All employees assigned</p>}
                    </div>
                  </>
                )}

                {assignMode === "all" && (
                  <p className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                    This will assign to all {unassignedEmployees.length} unassigned employee{unassignedEmployees.length !== 1 ? "s" : ""}.
                  </p>
                )}

                {assignMode === "department" && selectedDept !== "all" && (
                  <p className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                    {filteredUnassigned.length} unassigned in {selectedDept}
                  </p>
                )}

                {((assignMode === "individual" && selectedIds.size > 0) ||
                  assignMode === "all" ||
                  (assignMode === "department" && filteredUnassigned.length > 0)) && (
                  <>
                    <Button onClick={() => setShowAssignConfirm(true)} disabled={createAssignments.isPending} className="w-full">
                      {createAssignments.isPending ? "Assigning..." :
                        `Assign to ${getAssignTargetCount()} staff`}
                    </Button>

                    {/* Assignment Confirmation Dialog */}
                    <Dialog open={showAssignConfirm} onOpenChange={setShowAssignConfirm}>
                      <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                          <DialogTitle>Confirm Assignment</DialogTitle>
                          <DialogDescription>Review before assigning training.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2 text-sm py-2">
                          <div className="flex justify-between"><span className="text-muted-foreground">Module</span><span className="font-medium text-foreground truncate max-w-[200px]">{module.title}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Staff</span><span className="font-medium text-foreground">{getAssignTargetCount()} employee{getAssignTargetCount() !== 1 ? "s" : ""}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Source</span><Badge variant="outline" className="text-[10px]">{getAssignSourceLabel()}</Badge></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Due Date</span><span className="font-medium text-foreground">{dueDate ? format(parseISO(dueDate), "d MMM yyyy") : "No deadline"}</span></div>
                          {module.is_mandatory && <div className="flex justify-between"><span className="text-muted-foreground">Mandatory</span><Badge className="text-[10px] bg-destructive/10 text-destructive">Yes</Badge></div>}
                        </div>
                        <DialogFooter className="gap-2">
                          <Button variant="outline" onClick={() => setShowAssignConfirm(false)}>Cancel</Button>
                          <Button onClick={handleAssign} disabled={createAssignments.isPending}>
                            {createAssignments.isPending ? "Assigning..." : "Confirm"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </>
            )}
            {module.status !== "published" && (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">Module must be published before assigning to staff.</p>
              </div>
            )}
          </TabsContent>

          {module.requires_quiz && (
            <TabsContent value="quiz" className="mt-3">
              <QuizBuilder moduleId={module.id} canEdit={canManage && !isPlatform} />
            </TabsContent>
          )}
          {canManage && (
            <TabsContent value="standards" className="space-y-3 mt-3">
              <StandardsTabContent module={module} canEdit={canEdit} />
            </TabsContent>
          )}
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground capitalize">{value}</span>
    </div>
  );
}

// ─── Standards Tab Content ───

function StandardsTabContent({ module, canEdit }: { module: TrainingLibraryItem; canEdit: boolean }) {
  const { data: evidence = [] } = useModuleEvidence(module.id);
  const { data: insights = [] } = useReviewInsights(module.id);
  const { latestByModule: effByModule, records: allEffRecords } = useTrainingEffectiveness(true);
  const activeEvidence = evidence.filter(e => e.is_active);
  const activeInsights = insights.filter(i => i.is_active);

  // Governance recommendation
  const riskLevel = (module.standards_metadata as any)?.service_risk_level as ServiceRiskLevel | undefined;
  const govInput: ModuleGovernanceInput = {
    lastReviewedAt: module.last_reviewed_at ?? null,
    counts: { evidenceCount: activeEvidence.length, insightCount: activeInsights.length },
    isMandatory: module.is_mandatory,
    serviceRiskLevel: riskLevel,
  };
  const recommendation = getGovernanceRecommendation(govInput);
  const reasons = getGovernanceReasons(govInput);
  const health = classifyGovernance(govInput);

  return (
    <>
      {/* Recommendation line */}
      {recommendation && (
        <div className="rounded-lg border border-border bg-muted/30 p-2.5 space-y-1">
          <p className="text-[11px] font-medium text-foreground">{recommendation}</p>
          <div className="flex flex-wrap gap-1">
            {reasons.map((r, i) => (
              <span key={i} className="text-[9px] text-muted-foreground">• {r}</span>
            ))}
          </div>
        </div>
      )}

      {/* Content Strength Assessment */}
      <ContentStrengthPanel
        metadata={module.standards_metadata as StandardsMetadata | null}
        counts={{ evidenceCount: activeEvidence.length, insightCount: activeInsights.length }}
        isHighRisk={riskLevel === "high"}
        isMandatory={module.is_mandatory}
      />

      <ModuleGovernanceSummary
        lastReviewedAt={module.last_reviewed_at ?? null}
        counts={{ evidenceCount: activeEvidence.length, insightCount: activeInsights.length }}
        evidence={evidence}
      />
      <EvidenceCompletenessBar
        documentId={module.id}
        lastReviewedAt={module.last_reviewed_at ?? null}
        lastReviewedBy={module.last_reviewed_by ?? null}
        canEdit={canEdit}
      />
      <EvidencePanel documentId={module.id} canEdit={canEdit} />
      <ReviewInsightsPanel documentId={module.id} canEdit={canEdit} />

      {/* Training Effectiveness */}
      <ModuleEffectivenessPanel
        record={effByModule.get(module.id) ?? null}
        allRecords={allEffRecords.filter(r => r.module_id === module.id)}
        reviewInsightTags={(module.standards_metadata as any)?.review_insight_tags as ReviewInsightTag[] | undefined}
      />

      {module.standards_metadata && (
        <WhyThisMattersPanel metadata={module.standards_metadata as StandardsMetadata} />
      )}
    </>
  );
}


function AddModuleDialog() {
  const [open, setOpen] = useState(false);
  const createItem = useCreateLibraryItem();
  const [form, setForm] = useState({
    title: "", description: "", summary: "", category: "training",
    content_type: "document" as "document" | "internal_page" | "external_link",
    content_url: "", completion_type: "read_acknowledge",
    audience_scope: "all_staff",
    requires_acknowledgement: true, requires_completion: true,
    requires_quiz: false, counts_toward_readiness: false,
    is_mandatory: false, estimated_minutes: "",
    refresher_days: "", pass_mark: "80",
  });

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    createItem.mutate({
      title: form.title,
      description: form.description || null,
      summary: form.summary || null,
      category: form.category,
      content_type: form.content_type,
      content_url: form.content_url || null,
      completion_type: form.completion_type,
      audience_scope: form.audience_scope,
      requires_acknowledgement: form.requires_acknowledgement,
      requires_completion: form.requires_completion,
      requires_quiz: form.completion_type === "quiz" || form.completion_type === "blended",
      counts_toward_readiness: form.counts_toward_readiness,
      is_mandatory: form.is_mandatory,
      estimated_minutes: form.estimated_minutes ? parseInt(form.estimated_minutes) : null,
      refresher_days: form.refresher_days ? parseInt(form.refresher_days) : null,
      pass_mark: parseInt(form.pass_mark) || 80,
    } as any, {
      onSuccess: () => {
        setOpen(false);
        setForm({ title: "", description: "", summary: "", category: "training", content_type: "document", content_url: "", completion_type: "read_acknowledge", audience_scope: "all_staff", requires_acknowledgement: true, requires_completion: true, requires_quiz: false, counts_toward_readiness: false, is_mandatory: false, estimated_minutes: "", refresher_days: "", pass_mark: "80" });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> New Module</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create Training Module</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Allergen Awareness" /></div>
          <div><Label>Summary</Label><Input value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} placeholder="One-line summary" /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LIBRARY_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Completion Type</Label>
              <Select value={form.completion_type} onValueChange={v => setForm(f => ({ ...f, completion_type: v, requires_quiz: v === "quiz" || v === "blended" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{COMPLETION_TYPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Est. Minutes</Label><Input type="number" value={form.estimated_minutes} onChange={e => setForm(f => ({ ...f, estimated_minutes: e.target.value }))} /></div>
            <div>
              <Label>Refresher</Label>
              <Select value={form.refresher_days} onValueChange={v => setForm(f => ({ ...f, refresher_days: v }))}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Refresher</SelectItem>
                  <SelectItem value="90">Every 90 Days</SelectItem>
                  <SelectItem value="180">Every 6 Months</SelectItem>
                  <SelectItem value="365">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {(form.completion_type === "quiz" || form.completion_type === "blended") && (
            <div><Label>Pass Mark (%)</Label><Input type="number" value={form.pass_mark} onChange={e => setForm(f => ({ ...f, pass_mark: e.target.value }))} /></div>
          )}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div><p className="text-xs font-medium">Mandatory</p><p className="text-[10px] text-muted-foreground">Required for all assigned staff</p></div>
              <Switch checked={form.is_mandatory} onCheckedChange={v => setForm(f => ({ ...f, is_mandatory: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-xs font-medium">Counts Toward Readiness</p><p className="text-[10px] text-muted-foreground">Blocks work readiness if incomplete</p></div>
              <Switch checked={form.counts_toward_readiness} onCheckedChange={v => setForm(f => ({ ...f, counts_toward_readiness: v }))} />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">Module will be created as Draft. Review and publish when ready.</p>
          <Button onClick={handleSubmit} disabled={createItem.isPending} className="w-full">
            {createItem.isPending ? "Creating..." : "Create Module"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
