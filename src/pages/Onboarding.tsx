import { useState } from "react";
import { useEmployees } from "@/hooks/useEmployees";
import { useOnboardingTemplates, useOnboardingProgress, useInitOnboarding, useToggleOnboardingItem, type OnboardingTemplate } from "@/hooks/useOnboarding";
import { useOnboardingReviewQueue, useReviewRtw, useApproveOnboarding, type RtwStatus } from "@/hooks/useEmployeeOnboarding";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ClipboardCheck, UserPlus, ChevronDown, ChevronUp, FileText, GraduationCap,
  Wrench, LayoutList, Shield, CheckCircle2, XCircle, AlertTriangle, Clock,
  Eye, Send, User, Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const categoryIcons: Record<string, any> = {
  documents: FileText, training: GraduationCap, equipment: Wrench, general: LayoutList,
};
const categoryLabels: Record<string, string> = {
  documents: "Documents", training: "Training", equipment: "Equipment", general: "General",
};

const RTW_CONFIG: Record<RtwStatus, { label: string; icon: any; color: string; bg: string }> = {
  not_submitted: { label: "Not Submitted", icon: Clock, color: "text-muted-foreground", bg: "bg-muted" },
  submitted: { label: "Uploaded", icon: FileText, color: "text-primary", bg: "bg-primary/10" },
  pending_review: { label: "Awaiting Review", icon: Eye, color: "text-warning", bg: "bg-warning/10" },
  approved: { label: "Approved", icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
  rejected: { label: "Rejected", icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
};

export default function Onboarding() {
  const { data: employees = [] } = useEmployees();
  const { data: templates = [] } = useOnboardingTemplates();
  const { data: reviewQueue = [], isLoading: queueLoading } = useOnboardingReviewQueue();
  const starters = employees.filter(e => e.status === "starter" || (e.status as string) === "onboarding");
  const [selectedId, setSelectedId] = useState<string>("");
  const initOnboarding = useInitOnboarding();

  const activeId = selectedId || starters[0]?.id || "";

  const pendingReview = reviewQueue.filter(r => r.submitted_at && !r.onboarding_approved_at);
  const awaitingRtw = reviewQueue.filter(r => r.rtw_status === "pending_review");
  const inProgress = reviewQueue.filter(r => !r.submitted_at);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Onboarding</h1>
            <p className="text-muted-foreground">Review new starter progress and approve onboarding</p>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="In Progress" value={inProgress.length} icon={Clock} color="text-primary" />
          <KpiCard label="Submitted" value={pendingReview.length} icon={Send} color="text-warning" />
          <KpiCard label="RTW Awaiting Review" value={awaitingRtw.length} icon={Shield} color="text-destructive" />
          <KpiCard label="Total Starters" value={starters.length} icon={UserPlus} color="text-muted-foreground" />
        </div>

        <Tabs defaultValue="review" className="space-y-4">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="review" className="gap-2">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Review Queue</span>
              <span className="sm:hidden">Review</span>
              {pendingReview.length > 0 && (
                <Badge variant="destructive" className="h-5 min-w-5 text-[10px] px-1.5">{pendingReview.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="progress" className="gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">In Progress</span>
              <span className="sm:hidden">Progress</span>
            </TabsTrigger>
            <TabsTrigger value="checklist" className="gap-2">
              <ClipboardCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Checklist</span>
              <span className="sm:hidden">Tasks</span>
            </TabsTrigger>
          </TabsList>

          {/* Review Queue Tab */}
          <TabsContent value="review" className="space-y-4">
            {pendingReview.length === 0 ? (
              <div className="rounded-xl bg-card border border-border p-8 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto text-success mb-4" />
                <h3 className="text-lg font-semibold mb-2">No pending reviews</h3>
                <p className="text-muted-foreground text-sm">All submitted onboarding records have been reviewed.</p>
              </div>
            ) : (
              pendingReview.map(record => (
                <OnboardingReviewCard key={record.id} record={record} />
              ))
            )}
          </TabsContent>

          {/* In Progress Tab */}
          <TabsContent value="progress" className="space-y-4">
            {inProgress.length === 0 ? (
              <div className="rounded-xl bg-card border border-border p-8 text-center">
                <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No in-progress onboarding</h3>
                <p className="text-muted-foreground text-sm">All invited employees have either submitted or not started yet.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {inProgress.map(record => (
                  <InProgressCard key={record.id} record={record} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Checklist Tab */}
          <TabsContent value="checklist" className="space-y-4">
            {starters.length === 0 ? (
              <div className="rounded-xl bg-card border border-border shadow-card p-8 text-center">
                <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No New Starters</h3>
                <p className="text-muted-foreground">Add a new employee with 'starter' status to begin onboarding.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <Select value={activeId} onValueChange={setSelectedId}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select starter..." />
                    </SelectTrigger>
                    <SelectContent>
                      {starters.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.forename} {s.surname} ({s.department})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => activeId && initOnboarding.mutate(activeId)} disabled={!activeId || initOnboarding.isPending}>
                    <ClipboardCheck className="h-4 w-4 mr-1.5" />
                    {initOnboarding.isPending ? "Creating..." : "Init Checklist"}
                  </Button>
                </div>
                {activeId && <StarterChecklist employeeId={activeId} templates={templates} />}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div className="rounded-xl bg-card border border-border p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn("h-4 w-4", color)} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function OnboardingReviewCard({ record }: { record: any }) {
  const [expanded, setExpanded] = useState(false);
  const [rtwNotes, setRtwNotes] = useState("");
  const reviewRtw = useReviewRtw();
  const approveOnboarding = useApproveOnboarding();
  const emp = record.employee;
  if (!emp) return null;

  const rtwStatus = (record.rtw_status || "not_submitted") as RtwStatus;
  const rtwConfig = RTW_CONFIG[rtwStatus];
  const personalInfo = record.personal_info || {};
  const bankDetails = record.bank_details || {};
  const emergencyContact = record.emergency_contact || {};
  const canApprove = rtwStatus === "approved" || rtwStatus === "not_submitted";

  return (
    <div className="rounded-xl bg-card border border-border shadow-card overflow-hidden">
      {/* Header */}
      <button className="w-full px-5 py-4 flex items-center justify-between hover:bg-muted/20 transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary">{emp.forename[0]}{emp.surname[0]}</AvatarFallback>
          </Avatar>
          <div className="text-left">
            <p className="font-semibold text-foreground">{emp.forename} {emp.surname}</p>
            <p className="text-xs text-muted-foreground">{emp.department} · Submitted {record.submitted_at ? format(new Date(record.submitted_at), "d MMM yyyy") : "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={cn("text-xs gap-1", rtwConfig.bg, rtwConfig.color)}>
            <rtwConfig.icon className="h-3 w-3" />
            RTW: {rtwConfig.label}
          </Badge>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
              {/* Submitted info sections */}
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoSection title="Personal Details" items={[
                  { label: "Nationality", value: personalInfo.nationality || "—" },
                  { label: "NI Number", value: personalInfo.ni_number || "—" },
                  { label: "Phone", value: personalInfo.phone || "—" },
                  { label: "Address", value: personalInfo.address || "—" },
                  { label: "Settlement", value: personalInfo.settlement_status || "—" },
                  { label: "DOB", value: personalInfo.date_of_birth || "—" },
                ]} />
                <InfoSection title="Bank Details" items={[
                  { label: "Account Name", value: bankDetails.account_name || "—" },
                  { label: "Sort Code", value: bankDetails.sort_code || "—" },
                  { label: "Account No", value: bankDetails.account_number ? "••••" + bankDetails.account_number.slice(-4) : "—" },
                ]} />
              </div>

              <InfoSection title="Emergency Contact" items={[
                { label: "Name", value: emergencyContact.name || "—" },
                { label: "Relationship", value: emergencyContact.relationship || "—" },
                { label: "Phone", value: emergencyContact.phone || "—" },
              ]} />

              {/* RTW Review */}
              {(rtwStatus === "pending_review" || rtwStatus === "submitted") && (
                <div className="rounded-xl bg-warning/5 border border-warning/20 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-warning" />
                    <h4 className="font-semibold text-foreground text-sm">Right to Work — Review Required</h4>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Review uploaded documents in the employee's Documents section before approving.
                    Check passport, visa, and share code validity.
                  </p>
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Review notes (optional — required if rejecting)"
                      value={rtwNotes}
                      onChange={e => setRtwNotes(e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => reviewRtw.mutate({ employeeId: record.employee_id, status: "approved", notes: rtwNotes })}
                        disabled={reviewRtw.isPending}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve RTW
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1.5"
                        onClick={() => {
                          if (!rtwNotes.trim()) {
                            alert("Please add notes explaining why RTW is being rejected.");
                            return;
                          }
                          reviewRtw.mutate({ employeeId: record.employee_id, status: "rejected", notes: rtwNotes });
                        }}
                        disabled={reviewRtw.isPending}
                      >
                        <XCircle className="h-3.5 w-3.5" /> Reject RTW
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {rtwStatus === "approved" && (
                <div className="rounded-xl bg-success/5 border border-success/20 p-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <p className="text-sm text-success font-medium">Right to work approved</p>
                  {record.rtw_reviewed_at && <span className="text-xs text-muted-foreground ml-auto">{format(new Date(record.rtw_reviewed_at), "d MMM yyyy")}</span>}
                </div>
              )}

              {rtwStatus === "rejected" && (
                <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <p className="text-sm text-destructive font-medium">Right to work rejected</p>
                  </div>
                  {record.rtw_review_notes && <p className="text-xs text-muted-foreground">{record.rtw_review_notes}</p>}
                </div>
              )}

              {/* Approve Onboarding */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">Approve Onboarding</p>
                  <p className="text-xs text-muted-foreground">
                    {canApprove ? "Mark this employee as fully onboarded and active." : "Approve or resolve RTW before approving onboarding."}
                  </p>
                </div>
                <Button
                  onClick={() => approveOnboarding.mutate({ employeeId: record.employee_id })}
                  disabled={!canApprove || approveOnboarding.isPending}
                  className="gap-1.5"
                >
                  {approveOnboarding.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Approve & Activate
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoSection({ title, items }: { title: string; items: { label: string; value: string }[] }) {
  return (
    <div className="rounded-lg bg-muted/30 border border-border p-3">
      <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">{title}</h4>
      <div className="space-y-1">
        {items.map(item => (
          <div key={item.label} className="flex justify-between text-xs">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium text-foreground">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InProgressCard({ record }: { record: any }) {
  const emp = record.employee;
  if (!emp) return null;
  const step = record.step_completed || 0;
  const pct = Math.round((step / 6) * 100);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-primary/10 text-primary text-sm">{emp.forename[0]}{emp.surname[0]}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-foreground text-sm">{emp.forename} {emp.surname}</p>
          <p className="text-xs text-muted-foreground">{emp.department} · {emp.email || "No email"}</p>
        </div>
      </div>
      <Progress value={pct} className="h-1.5" />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Step {step}/6</span>
        <span>{pct}%</span>
      </div>
      <Badge variant="outline" className="text-xs">
        {step === 0 ? "Not started" : "In progress"}
      </Badge>
    </div>
  );
}

function StarterChecklist({ employeeId, templates }: { employeeId: string; templates: OnboardingTemplate[] }) {
  const { data: progress = [] } = useOnboardingProgress(employeeId);
  const toggle = useToggleOnboardingItem();
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  if (progress.length === 0) {
    return (
      <div className="rounded-xl bg-card border border-border shadow-card p-6 text-center">
        <p className="text-muted-foreground">No checklist items yet. Click "Init Checklist" to create one from the template.</p>
      </div>
    );
  }

  const grouped = progress.reduce((acc, item) => {
    const cat = (item.onboarding_templates as any)?.category || "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, typeof progress>);

  const completedCount = progress.filter(p => p.completed).length;
  const pct = Math.round((completedCount / progress.length) * 100);

  return (
    <div className="rounded-xl bg-card border border-border shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-card-foreground">Checklist Progress</h3>
          <Badge variant={pct === 100 ? "default" : "secondary"} className={cn(pct === 100 && "bg-success text-success-foreground")}>
            {completedCount}/{progress.length} ({pct}%)
          </Badge>
        </div>
        <Progress value={pct} className="h-2" />
      </div>
      <div className="divide-y divide-border">
        {Object.entries(grouped).sort(([a], [b]) => {
          const order = ["documents", "training", "equipment", "general"];
          return order.indexOf(a) - order.indexOf(b);
        }).map(([cat, items]) => {
          const CatIcon = categoryIcons[cat] || LayoutList;
          const catCompleted = items.filter(i => i.completed).length;
          const isExpanded = expandedCat === cat || expandedCat === null;
          return (
            <div key={cat}>
              <button
                className="flex items-center justify-between w-full px-5 py-3 hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedCat(expandedCat === cat ? null : cat)}
              >
                <div className="flex items-center gap-2">
                  <CatIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm text-card-foreground">{categoryLabels[cat] || cat}</span>
                  <Badge variant="outline" className="text-[10px]">{catCompleted}/{items.length}</Badge>
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                    {items.sort((a, b) => ((a.onboarding_templates as any)?.sort_order || 0) - ((b.onboarding_templates as any)?.sort_order || 0)).map(item => {
                      const tmpl = item.onboarding_templates as any;
                      return (
                        <label key={item.id} className="flex items-start gap-3 px-5 py-2.5 hover:bg-muted/20 cursor-pointer transition-colors">
                          <Checkbox
                            checked={item.completed}
                            onCheckedChange={(checked) => toggle.mutate({ id: item.id, completed: !!checked })}
                            className="mt-0.5"
                          />
                          <div className="min-w-0">
                            <p className={cn("text-sm font-medium", item.completed ? "text-muted-foreground line-through" : "text-card-foreground")}>{tmpl?.title}</p>
                            {tmpl?.description && <p className="text-xs text-muted-foreground">{tmpl.description}</p>}
                            {item.completed && item.completed_at && (
                              <p className="text-[10px] text-success mt-0.5">✓ Completed {new Date(item.completed_at).toLocaleDateString()}</p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
