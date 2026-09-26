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
import { ModuleSignalMappingManager } from "@/components/training/ModuleSignalMappingManager";
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
        // Signal quality filters
        case "sq_strong": {
          const sq = sqByModule.get(item.id);
          matchesEvidence = !!sq && sq.qualityStatus === "strong";
          break;
        }
        case "sq_acceptable": {
          const sq = sqByModule.get(item.id);
          matchesEvidence = !!sq && sq.qualityStatus === "acceptable";
          break;
        }
        case "sq_weak": {
          const sq = sqByModule.get(item.id);
          matchesEvidence = !!sq && sq.qualityStatus === "weak";
          break;
        }
        case "sq_unreliable": {
          const sq = sqByModule.get(item.id);
          matchesEvidence = !!sq && sq.qualityStatus === "unreliable";
          break;
        }
        case "sq_high_dupe": {
          const sq = sqByModule.get(item.id);
          matchesEvidence = !!sq && sq.duplicateRisk === "high";
          break;
        }
        case "sq_weak_attr": {
          const sq = sqByModule.get(item.id);
          matchesEvidence = !!sq && sq.attributionStrength === "weak";
          break;
        }
        case "sq_low_vol": {
          const sq = sqByModule.get(item.id);
          matchesEvidence = !!sq && sq.volumeLevel === "low";
          break;
        }
        case "sq_vague": {
          const sq = sqByModule.get(item.id);
          matchesEvidence = !!sq && sq.vaguenessFlag === true;
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
                <SelectItem value="tenant">Tenant…13467 tokens truncated…      (info.address as string) ||
      "";
    const out: string[] = [];
    if (!String(emp.forename ?? "").trim() || !String(emp.surname ?? "").trim()) out.push("Legal name");
    if (!String(address).trim()) out.push("Home address");
    if (!String(emp.start_date ?? "").trim()) out.push("Start date");
    if (!Number.isFinite(Number(emp.hourly_rate)) || Number(emp.hourly_rate) <= 0) out.push("Hourly rate");
    if (!String(emp.department ?? "").trim()) out.push("Role or department");
    return out;
  }, [record]);

  const bankAwaitingDirectConfirmation = changes.some(
    (c) => isBankField(c.field_name) && c.state !== "rejected" && c.needs_review
      && !record?.verifiedBankChanges.includes(c.id),
  );

  const result = evaluateContractAutoDraft({
    changes: changes.map((c) => ({
      field_name: c.field_name,
      field_label: c.field_label,
      state: c.state,
      needs_review: c.needs_review,
    })),
    rtwStatus: rtw?.rtw_status ?? null,
    rtwExpiresOn: rtw?.rtw_expires_on ?? null,
    bankAwaitingDirectConfirmation,
    missingContractFields,
    hasContract: record?.hasContract ?? false,
  });

  const queries = [changesQuery, rtwQuery, recordQuery];
  const loading = queries.some(query => query.isLoading || query.isFetching);
  const unavailable = !tenantId || !employeeId || queries.some(query => query.isError) || !record;
  return {
    ...result,
    ready: !loading && !unavailable && result.ready,
    outstanding: loading ? ["Checking staff details and approvals…"]
      : unavailable ? ["Staff checks could not be loaded. Retry before preparing the contract."]
      : result.outstanding,
    loading,
    error: unavailable && !loading,
    retry: () => { queries.forEach(query => { void query.refetch(); }); },
    prepareHref: employeeId ? `/contracts?employee=${employeeId}` : "/contracts",
  };
}
