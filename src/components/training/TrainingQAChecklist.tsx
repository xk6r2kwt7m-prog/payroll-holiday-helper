import { useState, useEffect, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, Clock, RotateCcw, Copy, ChevronDown, ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface QAItem { id: string; label: string; category: string; }

const QA_ITEMS: QAItem[] = [
  { id: "create_module", label: "Create a new tenant module (Draft)", category: "Library" },
  { id: "edit_module", label: "Edit a tenant module and save changes", category: "Library" },
  { id: "publish_module", label: "Publish a module (Draft → Published)", category: "Library" },
  { id: "platform_block", label: "Confirm platform modules cannot be edited", category: "Library" },
  { id: "archived_block", label: "Confirm archived modules cannot be edited", category: "Library" },
  { id: "published_edit_warning", label: "Published module edit shows confirmation warning", category: "Governance" },
  { id: "assign_individual", label: "Assign training to an individual employee", category: "Assignments" },
  { id: "assign_department", label: "Assign training by department", category: "Assignments" },
  { id: "assign_all", label: "Assign training to all staff", category: "Assignments" },
  { id: "assign_confirm_dialog", label: "Assignment shows confirmation summary before proceeding", category: "Assignments" },
  { id: "duplicate_prevention", label: "Duplicate assignment is skipped with toast", category: "Assignments" },
  { id: "source_badge", label: "Source badge visible in tracking view (Dept/All Staff/Retrain)", category: "Assignments" },
  { id: "module_version", label: "New assignments have correct module_version", category: "Assignments" },
  { id: "quiz_fail_retry", label: "Fail a quiz and retry — attempt count correct", category: "Quiz" },
  { id: "quiz_pass_lock", label: "Pass a quiz — locked from further attempts", category: "Quiz" },
  { id: "quiz_persist_reload", label: "Reload page — attempt count persists from DB", category: "Quiz" },
  { id: "quiz_retry_limit", label: "Hit retry limit — quiz locked with message", category: "Quiz" },
  { id: "signoff_pass", label: "Manager sign-off pass — marked completed", category: "Sign-off" },
  { id: "signoff_fail_no_retrain", label: "Manager sign-off fail without retrain toggle", category: "Sign-off" },
  { id: "signoff_fail_retrain", label: "Manager sign-off fail with retrain — new assignment created", category: "Sign-off" },
  { id: "retrain_no_duplicate", label: "Retrain does not create duplicate if one is active", category: "Sign-off" },
  { id: "staff_published_only", label: "Staff only see published training (no draft/archived)", category: "Permissions" },
  { id: "tenant_isolation", label: "Switch tenant — no cross-tenant training data visible", category: "Permissions" },
  { id: "csv_export", label: "CSV export works for library, assignments, and compliance", category: "Exports" },
  { id: "audit_entries", label: "Audit log entries created for key actions", category: "Audit" },
];

type CheckState = "pass" | "fail" | "untested";

const QA_VERSION = 1;

interface PersistedState {
  version: number;
  checks: Record<string, CheckState>;
  notes: Record<string, string>;
  lastUpdated: string | null;
  checkedBy: string;
  signedOff: boolean;
  signedOffAt: string | null;
  signedOffBy: string | null;
}

const EMPTY: PersistedState = {
  version: QA_VERSION,
  checks: {}, notes: {}, lastUpdated: null,
  checkedBy: "", signedOff: false, signedOffAt: null, signedOffBy: null,
};

function key(tenantId: string) { return `training_qa_checklist:${tenantId}`; }

function fmtTs(iso: string | null): string {
  if (!iso) return "Never";
  try { return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); }
  catch { return "Unknown"; }
}

export function TrainingQAChecklist() {
  const { tenantId, tenantName } = useTenant();
  const [checks, setChecks] = useState<Record<string, CheckState>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [checkedBy, setCheckedBy] = useState("");
  const [signedOff, setSignedOff] = useState(false);
  const [signedOffAt, setSignedOffAt] = useState<string | null>(null);
  const [signedOffBy, setSignedOffBy] = useState<string | null>(null);
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});
  const [showSignOffDialog, setShowSignOffDialog] = useState(false);

  // ── Shared clear helper ──
  const clearSignOff = useCallback(() => {
    setSignedOff(false);
    setSignedOffAt(null);
    setSignedOffBy(null);
  }, []);

  const clearAll = useCallback(() => {
    setChecks({});
    setNotes({});
    setLastUpdated(null);
    setCheckedBy("");
    clearSignOff();
    setOpenNotes({});
  }, [clearSignOff]);

  // ── Debounced persist ref ──
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (persistTimerRef.current) clearTimeout(persistTimerRef.current); }, []);

  // ── Load ──
  useEffect(() => {
    if (!tenantId) { clearAll(); return; }
    try {
      const raw = localStorage.getItem(key(tenantId));
      if (raw) {
        const p: PersistedState = { ...EMPTY, ...JSON.parse(raw) };
        if (p.version !== QA_VERSION) { clearAll(); localStorage.removeItem(key(tenantId)); return; }
        setChecks(p.checks); setNotes(p.notes); setLastUpdated(p.lastUpdated);
        setCheckedBy(p.checkedBy); setSignedOff(p.signedOff);
        setSignedOffAt(p.signedOffAt); setSignedOffBy(p.signedOffBy);
      } else { clearAll(); }
    } catch { clearAll(); }
    setOpenNotes({});
  }, [tenantId, clearAll]);

  // ── Persist (debounced) ──
  useEffect(() => {
    if (!tenantId) return;
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      const s: PersistedState = { version: QA_VERSION, checks, notes, lastUpdated, checkedBy, signedOff, signedOffAt, signedOffBy };
      localStorage.setItem(key(tenantId), JSON.stringify(s));
    }, 400);
  }, [checks, notes, lastUpdated, checkedBy, signedOff, signedOffAt, signedOffBy, tenantId]);

  // ── Touch (invalidates sign-off) ──
  const touch = useCallback(() => {
    setLastUpdated(new Date().toISOString());
    clearSignOff();
  }, [clearSignOff]);

  const toggle = (id: string) => {
    setChecks(prev => {
      const cur = prev[id] || "untested";
      const next: CheckState = cur === "untested" ? "pass" : cur === "pass" ? "fail" : "untested";
      return { ...prev, [id]: next };
    });
    touch();
  };

  const updateNote = (id: string, v: string) => { setNotes(prev => ({ ...prev, [id]: v })); touch(); };
  const updateCheckedBy = (v: string) => { setCheckedBy(v); touch(); };

  const resetChecklist = useCallback(() => {
    clearAll();
    if (tenantId) localStorage.removeItem(key(tenantId));
    toast.success("Checklist reset");
  }, [tenantId, clearAll]);

  // ── Derived ──
  const totalChecked = Object.values(checks).filter(v => v !== "untested").length;
  const totalPassed = Object.values(checks).filter(v => v === "pass").length;
  const totalFailed = Object.values(checks).filter(v => v === "fail").length;
  const allTestedNoneFailed = totalChecked === QA_ITEMS.length && totalFailed === 0;
  const canSignOff = allTestedNoneFailed && !signedOff && checkedBy.trim().length > 0;

  const doSignOff = () => {
    const now = new Date().toISOString();
    setSignedOff(true);
    setSignedOffAt(now);
    setSignedOffBy(checkedBy.trim());
    setLastUpdated(now);
    setShowSignOffDialog(false);
    toast.success("Signed off — ready for pilot");
  };

  // ── Copy ──
  const copySummary = useCallback(() => {
    const totalUntested = QA_ITEMS.length - totalChecked;
    const failedItems = QA_ITEMS.filter(i => checks[i.id] === "fail");
    const now = new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

    const status = signedOff
      ? "Ready for pilot"
      : allTestedNoneFailed
        ? "Awaiting sign-off"
        : totalFailed > 0
          ? "Needs review"
          : "In progress";

    let t = `Training QA Checklist\nTenant: ${tenantName || "Unknown"}\nExported: ${now}\nStatus: ${status}`;
    if (checkedBy.trim()) t += `\nChecked by: ${checkedBy.trim()}`;
    if (signedOff) t += `\nSigned off by: ${signedOffBy} on ${fmtTs(signedOffAt)}`;
    if (lastUpdated) t += `\nLast updated: ${fmtTs(lastUpdated)}`;
    t += `\n\nPassed: ${totalPassed}\nFailed: ${totalFailed}\nUntested: ${totalUntested}`;
    if (failedItems.length > 0) {
      t += `\n\nFailed items:`;
      failedItems.forEach(i => {
        t += `\n  ✗ ${i.label}`;
        const n = notes[i.id]?.trim();
        if (n) t += `\n    Note: ${n}`;
      });
    }
    if (!navigator.clipboard) {
      toast.error("Clipboard not available in this browser");
      return;
    }
    navigator.clipboard.writeText(t).then(
      () => toast.success("Summary copied to clipboard"),
      () => toast.error("Failed to copy — clipboard access denied")
    );
  }, [checks, notes, tenantName, checkedBy, signedOff, signedOffBy, signedOffAt, lastUpdated, totalChecked, totalPassed, totalFailed, allTestedNoneFailed]);

  // ── Readiness badge ──
  const categories = [...new Set(QA_ITEMS.map(i => i.category))];

  const readiness = signedOff
    ? { label: "Signed Off", variant: "default" as const, icon: <ShieldCheck className="h-3.5 w-3.5" /> }
    : allTestedNoneFailed
      ? { label: "Ready for Pilot", variant: "default" as const, icon: <ShieldCheck className="h-3.5 w-3.5" /> }
      : totalFailed > 0
        ? { label: "Needs Review", variant: "destructive" as const, icon: <AlertTriangle className="h-3.5 w-3.5" /> }
        : { label: "In Progress", variant: "outline" as const, icon: <Loader2 className="h-3.5 w-3.5" /> };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-foreground">Training Module QA Checklist</h3>
            <Badge variant={readiness.variant} className="gap-1 text-[10px]">
              {readiness.icon} {readiness.label}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Use this before pilot, release, or major training changes.
          </p>
          {signedOff && signedOffBy && (
            <p className="text-[11px] text-success font-medium">
              Signed off by {signedOffBy} on {fmtTs(signedOffAt)}
            </p>
          )}
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={copySummary}>
            <Copy className="h-3 w-3" /> Copy
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-destructive hover:text-destructive">
                <RotateCcw className="h-3 w-3" /> Reset
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset QA Checklist?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will clear all pass/fail states, notes, tester name, and sign-off for this workspace. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={resetChecklist}>Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Checked by */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-muted-foreground shrink-0">Checked by</label>
        <Input
          value={checkedBy}
          onChange={(e) => updateCheckedBy(e.target.value)}
          placeholder="Your name"
          className="h-7 text-xs max-w-[200px]"
        />
      </div>

      {/* Summary strip */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        <span className="text-muted-foreground">{QA_ITEMS.length} items</span>
        <span className="text-muted-foreground">{totalChecked} tested</span>
        <span className="text-success font-medium">{totalPassed} passed</span>
        {totalFailed > 0 && <span className="text-destructive font-medium">{totalFailed} failed</span>}
        {lastUpdated && (
          <span className="text-muted-foreground">· Last updated: {fmtTs(lastUpdated)}</span>
        )}
      </div>

      {/* Items */}
      {categories.map(cat => (
        <div key={cat} className="space-y-1.5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{cat}</p>
          {QA_ITEMS.filter(i => i.category === cat).map(item => {
            const state = checks[item.id] || "untested";
            const noteOpen = !!openNotes[item.id];
            const hasNote = !!notes[item.id]?.trim();
            return (
              <Collapsible key={item.id} open={noteOpen}>
                <div className={cn(
                  "w-full rounded-lg border text-sm transition-all",
                  state === "pass" ? "bg-success/5 border-success/20" :
                  state === "fail" ? "bg-destructive/5 border-destructive/20" :
                  "bg-card border-border"
                )}>
                  <div className="flex items-center gap-2.5 p-2.5">
                    <button onClick={() => toggle(item.id)} className="flex items-center gap-2.5 flex-1 text-left min-w-0">
                      {state === "pass" ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" /> :
                       state === "fail" ? <XCircle className="h-4 w-4 text-destructive shrink-0" /> :
                       <Clock className="h-4 w-4 text-muted-foreground shrink-0" />}
                      <span className={cn(
                        "flex-1 truncate",
                        state === "pass" ? "text-foreground" :
                        state === "fail" ? "text-destructive" :
                        "text-muted-foreground"
                      )}>{item.label}</span>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      {hasNote && !noteOpen && <span className="text-[9px] text-muted-foreground">📝</span>}
                      <Badge variant="outline" className="text-[9px]">
                        {state === "untested" ? "Click to test" : state}
                      </Badge>
                      <CollapsibleTrigger asChild>
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenNotes(p => ({ ...p, [item.id]: !p[item.id] })); }}
                          className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted/50 text-muted-foreground"
                        >
                          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", noteOpen && "rotate-180")} />
                        </button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                  <CollapsibleContent>
                    <div className="px-2.5 pb-2.5">
                      <Textarea
                        placeholder="Add a note…"
                        value={notes[item.id] || ""}
                        onChange={(e) => updateNote(item.id, e.target.value)}
                        className="min-h-[56px] text-xs bg-background/50"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      ))}

      {/* Footer status blocks */}
      {totalFailed > 0 && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
          <p className="text-xs font-medium text-destructive">{totalFailed} item{totalFailed !== 1 ? "s" : ""} failed — review before pilot</p>
        </div>
      )}

      {allTestedNoneFailed && !signedOff && (
        <div className="rounded-lg border border-success/20 bg-success/5 p-3 flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-success">All {QA_ITEMS.length} checks passed ✓</p>
          <Button
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setShowSignOffDialog(true)}
            disabled={!canSignOff}
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Mark Ready for Pilot
          </Button>
        </div>
      )}

      {signedOff && (
        <div className="rounded-xl border-2 border-success/30 bg-success/5 p-4 space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-success" />
            <p className="text-sm font-semibold text-success">Ready for pilot</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Signed off by <span className="font-medium text-foreground">{signedOffBy}</span> on {fmtTs(signedOffAt)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Any checklist change will automatically revoke this sign-off.
          </p>
        </div>
      )}

      {/* Sign-off confirmation dialog */}
      <Dialog open={showSignOffDialog} onOpenChange={setShowSignOffDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm QA Sign-off</DialogTitle>
            <DialogDescription>
              You are about to mark this training module checklist as ready for pilot.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Workspace</span>
              <span className="font-medium text-foreground">{tenantName || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Checked by</span>
              <span className="font-medium text-foreground">{checkedBy.trim() || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total items</span>
              <span className="font-medium text-foreground">{QA_ITEMS.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Passed</span>
              <span className="font-medium text-success">{totalPassed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Failed</span>
              <span className={cn("font-medium", totalFailed > 0 ? "text-destructive" : "text-foreground")}>{totalFailed}</span>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowSignOffDialog(false)}>Cancel</Button>
            <Button onClick={doSignOff} disabled={!canSignOff} className="gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Confirm Sign-off
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
