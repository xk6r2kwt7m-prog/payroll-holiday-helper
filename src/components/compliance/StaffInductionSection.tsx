import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Send, Users, CheckCircle2, Clock, Mail, ArrowLeft, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEmployees } from "@/hooks/useEmployees";
import { useTenantBranches } from "@/hooks/useBranches";
import { useComplianceDocuments, useInductionPacks, useSendInduction } from "@/hooks/useCompliance";
import { isAvailableToStaff } from "@/lib/compliance-document-fields";
import { STAFF_ROLES, suggestStaffRole, roleMaySellAlcohol } from "@/lib/compliance-taxonomy";
import { selectInductionDocuments, summariseSelection } from "@/lib/induction-pack-selection";
import { cn } from "@/lib/utils";
import { InductionReviewDialog } from "./InductionReviewDialog";

type Step = "who" | "branch" | "role" | "email" | "review";
const STEPS: Step[] = ["who", "branch", "role", "email", "review"];

export function StaffInductionSection() {
  const { data: employees = [] } = useEmployees();
  const { data: branches = [] } = useTenantBranches();
  const { data: allDocuments = [] } = useComplianceDocuments();
  /** Drafts and rejected documents are never sent to staff. */
  const documents = useMemo(
    () => (allDocuments as any[]).filter(isAvailableToStaff),
    [allDocuments]
  );
  const { data: packs = [] } = useInductionPacks();
  const sendInduction = useSendInduction();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("who");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [branch, setBranch] = useState<string>("");
  const [staffRole, setStaffRole] = useState<string>("");
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [excluded, setExcluded] = useState<string[]>([]);
  const [extra, setExtra] = useState<string[]>([]);
  const [includeAlcohol, setIncludeAlcohol] = useState(false);
  const [testSend, setTestSend] = useState(false);
  const [sending, setSending] = useState(false);
  const [reviewPack, setReviewPack] = useState<{ id: string; name: string } | null>(null);

  const active = useMemo(
    () => employees.filter((e: any) => !e.archived_at && e.status !== "leaver"),
    [employees]
  );

  const autoSelected = useMemo(
    () => selectInductionDocuments({ documents: documents as any[], branch, role: staffRole, includeAlcohol }),
    [documents, branch, staffRole, includeAlcohol]
  );

  const finalDocIds = useMemo(() => {
    const base = autoSelected.filter(d => !excluded.includes(d.id)).map(d => d.id);
    return [...new Set([...base, ...extra])];
  }, [autoSelected, excluded, extra]);

  const reset = () => {
    setStep("who"); setSelectedIds([]); setBranch(""); setStaffRole("");
    setEmails({}); setExcluded([]); setExtra([]); setIncludeAlcohol(false); setTestSend(false);
  };

  const startWizard = () => { reset(); setOpen(true); };

  const pickEmployee = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));
  };

  const goNext = () => {
    if (step === "who") {
      if (selectedIds.length === 0) { toast.error("Choose at least one staff member"); return; }
      const first: any = active.find((e: any) => e.id === selectedIds[0]);
      if (!branch) setBranch(branches[0] ?? "");
      if (!staffRole) {
        const guess = suggestStaffRole(first?.department, undefined);
        if (guess) { setStaffRole(guess); setIncludeAlcohol(roleMaySellAlcohol(guess)); }
      }
      const seeded: Record<string, string> = {};
      selectedIds.forEach(id => {
        const emp: any = active.find((e: any) => e.id === id);
        seeded[id] = emails[id] ?? emp?.email ?? "";
      });
      setEmails(seeded);
    }
    if (step === "branch" && !branch) { toast.error("Choose the branch they work at"); return; }
    if (step === "role" && !staffRole) { toast.error("Choose their role"); return; }
    if (step === "email") {
      const missing = selectedIds.filter(id => !emails[id]?.includes("@"));
      if (missing.length > 0) { toast.error("Every selected person needs a valid email address"); return; }
    }
    setStep(STEPS[Math.min(STEPS.indexOf(step) + 1, STEPS.length - 1)]);
  };

  const goBack = () => setStep(STEPS[Math.max(STEPS.indexOf(step) - 1, 0)]);

  const handleSend = async () => {
    if (finalDocIds.length === 0) { toast.error("No documents selected"); return; }
    setSending(true);
    try {
      // Save any corrected email addresses to the staff record first (visible action).
      for (const id of selectedIds) {
        const emp: any = active.find((e: any) => e.id === id);
        if (emails[id] && emails[id] !== emp?.email) {
          const { error } = await supabase.from("employees").update({ email: emails[id] }).eq("id", id);
          if (error) throw error;
        }
      }
      const result: any = await sendInduction.mutateAsync({
        employeeIds: selectedIds,
        branch,
        staffRole,
        documentIds: finalDocIds,
        includesAlcohol: includeAlcohol,
        testSend,
      });
      const failed = (result?.results ?? []).filter((r: any) => !r.sent);
      if (result?.sent > 0) {
        toast.success(`Induction sent to ${result.sent} ${result.sent === 1 ? "person" : "people"}`);
      }
      if (failed.length > 0) {
        toast.error(`${failed.length} could not be sent: ${failed[0]?.error ?? "unknown reason"}`);
      }
      if (result?.sent > 0) setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const incomplete = packs.filter((p: any) => !p.completed_at);
  const completed = packs.filter((p: any) => p.completed_at);

  const stepTitle: Record<Step, string> = {
    who: "Who is this induction for?",
    branch: "Which branch do they work at?",
    role: "What is their role?",
    email: "Confirm their email address",
    review: "Review and send",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Staff induction</h2>
          <p className="text-xs text-muted-foreground">
            Pick the person, branch and role — the right documents are chosen for you.
          </p>
        </div>
        <Button onClick={startWizard}><Send className="h-4 w-4 mr-1.5" /> Send induction</Button>
      </div>

      {incomplete.length > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 space-y-2">
          <p className="text-xs font-semibold text-warning uppercase tracking-wide">Not finished yet</p>
          {incomplete.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">
                {p.employees ? `${p.employees.forename} ${p.employees.surname}` : "Staff member"}
                {p.branch ? ` · ${p.branch}` : ""}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className="text-[10px] bg-warning/10 text-warning">
                  <Clock className="h-3 w-3 mr-1" />
                  {p.opened_at ? "Opened, not completed" : "Sent, not opened"}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setReviewPack({
                    id: p.id,
                    name: p.employees ? `${p.employees.forename} ${p.employees.surname}` : "Staff member",
                  })}
                >
                  Progress
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Completed inductions</p>
        </div>
        {completed.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No completed inductions yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {completed.map((p: any) => (
              <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {p.employees ? `${p.employees.forename} ${p.employees.surname}` : "Staff member"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.branch} · {p.staff_role} · completed{" "}
                    {new Date(p.completed_at).toLocaleDateString("en-GB")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setReviewPack({
                      id: p.id,
                      name: p.employees ? `${p.employees.forename} ${p.employees.surname}` : "Staff member",
                    })}
                  >
                    Review &amp; verify
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{stepTitle[step]}</DialogTitle>
          </DialogHeader>

          {step === "who" && (
            <div className="space-y-1 max-h-[50vh] overflow-y-auto">
              {active.map((e: any) => (
                <label
                  key={e.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 cursor-pointer",
                    selectedIds.includes(e.id) ? "border-primary bg-primary/5" : "border-border"
                  )}
                >
                  <Checkbox checked={selectedIds.includes(e.id)} onCheckedChange={() => pickEmployee(e.id)} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{e.forename} {e.surname}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {e.department}{e.email ? ` · ${e.email}` : " · no email on record"}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}

          {step === "branch" && (
            <div className="space-y-2">
              {branches.map((b: string) => (
                <button
                  key={b}
                  onClick={() => setBranch(b)}
                  className={cn(
                    "w-full text-left rounded-lg border p-3 text-sm",
                    branch === b ? "border-primary bg-primary/5 font-medium" : "border-border"
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
          )}

          {step === "role" && (
            <div className="space-y-2">
              {STAFF_ROLES.map(r => (
                <button
                  key={r}
                  onClick={() => { setStaffRole(r); setIncludeAlcohol(roleMaySellAlcohol(r)); }}
                  className={cn(
                    "w-full text-left rounded-lg border p-3 text-sm",
                    staffRole === r ? "border-primary bg-primary/5 font-medium" : "border-border"
                  )}
                >
                  {r}
                </button>
              ))}
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Will sell alcohol</p>
                  <p className="text-xs text-muted-foreground">Adds age verification and written authorisation.</p>
                </div>
                <Switch checked={includeAlcohol} onCheckedChange={setIncludeAlcohol} />
              </div>
            </div>
          )}

          {step === "email" && (
            <div className="space-y-3">
              {selectedIds.map(id => {
                const emp: any = active.find((e: any) => e.id === id);
                return (
                  <div key={id} className="space-y-1.5">
                    <Label className="text-sm">{emp?.forename} {emp?.surname}</Label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="pl-8"
                        value={emails[id] ?? ""}
                        placeholder="name@example.com"
                        onChange={(e) => setEmails(m => ({ ...m, [id]: e.target.value }))}
                      />
                    </div>
                    {emails[id] && emp?.email && emails[id] !== emp.email && (
                      <p className="text-xs text-warning">This will be saved to their staff record.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {step === "review" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border p-3 text-sm space-y-1">
                <p><span className="text-muted-foreground">People:</span> {selectedIds.length}</p>
                <p><span className="text-muted-foreground">Branch:</span> {branch}</p>
                <p><span className="text-muted-foreground">Role:</span> {staffRole}</p>
                <p><span className="text-muted-foreground">Alcohol sales:</span> {includeAlcohol ? "Yes" : "No"}</p>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">{summariseSelection(finalDocIds.length)}</p>
                <div className="space-y-1 max-h-[32vh] overflow-y-auto">
                  {autoSelected.map(d => (
                    <label key={d.id} className="flex items-start gap-2 rounded-lg border border-border p-2.5 text-sm">
                      <Checkbox
                        checked={!excluded.includes(d.id)}
                        onCheckedChange={(v) =>
                          setExcluded(list => (v === true ? list.filter(i => i !== d.id) : [...list, d.id]))
                        }
                      />
                      <span className="min-w-0">
                        <span className="block truncate">{d.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {d.category}{d.requires_signature ? " · signature" : ""}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Add another document (optional)</p>
                <Select value="" onValueChange={(v) => setExtra(list => [...new Set([...list, v])])}>
                  <SelectTrigger><SelectValue placeholder="Choose a document" /></SelectTrigger>
                  <SelectContent>
                    {(documents as any[])
                      .filter(d => !autoSelected.some(a => a.id === d.id))
                      .map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {extra.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1.5">{extra.length} extra document(s) added.</p>
                )}
              </div>

              <div className="flex items-center justify-between rounded-lg border border-dashed border-border p-3">
                <div>
                  <p className="text-sm font-medium">Send to me instead (test run)</p>
                  <p className="text-xs text-muted-foreground">Nothing is recorded as sent to staff.</p>
                </div>
                <Switch checked={testSend} onCheckedChange={setTestSend} />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {step !== "who" && (
              <Button variant="outline" onClick={goBack}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
            {step !== "review" ? (
              <Button onClick={goNext}>Next <ArrowRight className="h-4 w-4 ml-1" /></Button>
            ) : (
              <Button onClick={handleSend} disabled={sending}>
                {sending ? "Sending..." : "Send induction"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InductionReviewDialog
        packId={reviewPack?.id ?? null}
        employeeName={reviewPack?.name ?? ""}
        onClose={() => setReviewPack(null)}
      />
    </div>
  );
}
