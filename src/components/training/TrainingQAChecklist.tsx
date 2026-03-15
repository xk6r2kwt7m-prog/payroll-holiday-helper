import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface QAItem {
  id: string;
  label: string;
  category: string;
}

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

export function TrainingQAChecklist() {
  const [checks, setChecks] = useState<Record<string, CheckState>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const toggle = (id: string) => {
    setChecks(prev => {
      const current = prev[id] || "untested";
      const next: CheckState = current === "untested" ? "pass" : current === "pass" ? "fail" : "untested";
      return { ...prev, [id]: next };
    });
  };

  const categories = [...new Set(QA_ITEMS.map(i => i.category))];
  const totalChecked = Object.values(checks).filter(v => v !== "untested").length;
  const totalPassed = Object.values(checks).filter(v => v === "pass").length;
  const totalFailed = Object.values(checks).filter(v => v === "fail").length;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-foreground">Training Module QA Checklist</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {totalChecked}/{QA_ITEMS.length} tested · {totalPassed} passed · {totalFailed} failed
        </p>
      </div>

      {categories.map(cat => (
        <div key={cat} className="space-y-1.5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{cat}</p>
          {QA_ITEMS.filter(i => i.category === cat).map(item => {
            const state = checks[item.id] || "untested";
            return (
              <button
                key={item.id}
                onClick={() => toggle(item.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 p-2.5 rounded-lg border text-left text-sm transition-all",
                  state === "pass" ? "bg-success/5 border-success/20" :
                  state === "fail" ? "bg-destructive/5 border-destructive/20" :
                  "bg-card border-border hover:bg-muted/50"
                )}
              >
                {state === "pass" ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" /> :
                 state === "fail" ? <XCircle className="h-4 w-4 text-destructive shrink-0" /> :
                 <Clock className="h-4 w-4 text-muted-foreground shrink-0" />}
                <span className={cn(
                  "flex-1",
                  state === "pass" ? "text-foreground" :
                  state === "fail" ? "text-destructive" :
                  "text-muted-foreground"
                )}>{item.label}</span>
                <Badge variant="outline" className="text-[9px] shrink-0">
                  {state === "untested" ? "Click to test" : state}
                </Badge>
              </button>
            );
          })}
        </div>
      ))}

      {totalFailed > 0 && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
          <p className="text-xs font-medium text-destructive">{totalFailed} item{totalFailed !== 1 ? "s" : ""} failed — review before pilot</p>
        </div>
      )}

      {totalChecked === QA_ITEMS.length && totalFailed === 0 && (
        <div className="rounded-lg border border-success/20 bg-success/5 p-3">
          <p className="text-xs font-medium text-success">All {QA_ITEMS.length} checks passed ✓</p>
        </div>
      )}
    </div>
  );
}
