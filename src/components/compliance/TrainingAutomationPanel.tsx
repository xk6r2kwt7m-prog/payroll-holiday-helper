import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Clock, RefreshCw, GraduationCap } from "lucide-react";
import { useInductionPacks } from "@/hooks/useCompliance";
import { useEmployees } from "@/hooks/useEmployees";
import { useTenantPreferences, useSaveTenantPreferences } from "@/hooks/useTenantPreferences";
import { useVersionReissues, useDecideVersionReissue } from "@/hooks/useTrainingAutomation";
import {
  unfinishedInductions, inductionStageLabel, reissueDecisionLabel, reissueDecisionTone,
  type ReissueDecision,
} from "@/lib/training-automation";
import { cn } from "@/lib/utils";

const toneClass: Record<string, string> = {
  amber: "bg-warning/10 text-warning",
  green: "bg-success/10 text-success",
  grey: "bg-muted text-muted-foreground",
};

export function TrainingAutomationPanel() {
  const { data: packs = [] } = useInductionPacks();
  const { data: employees = [] } = useEmployees();
  const { data: reissues = [] } = useVersionReissues();
  const decide = useDecideVersionReissue();
  const { data: prefs } = useTenantPreferences("training_docs", { auto_assign_induction: false });
  const savePrefs = useSaveTenantPreferences();

  const [deciding, setDeciding] = useState<any | null>(null);
  const [choice, setChoice] = useState<Exclude<ReissueDecision, "pending">>("acknowledge");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const nameOf = useMemo(() => {
    const map = new Map<string, string>();
    (employees as any[]).forEach((e) => map.set(e.id, `${e.forename} ${e.surname}`));
    return map;
  }, [employees]);

  const outstanding = useMemo(() => unfinishedInductions(packs as any[]), [packs]);
  const pending = (reissues as any[]).filter((r) => r.decision === "pending");
  const settled = (reissues as any[]).filter((r) => r.decision !== "pending").slice(0, 5);

  const submitDecision = async () => {
    setBusy(true);
    try {
      await decide.mutateAsync({
        id: deciding.id,
        decision: choice,
        note: note.trim() || undefined,
        actionedEmployeeIds: choice === "no_action" ? [] : deciding.affected_employee_ids ?? [],
      });
      toast.success("Decision recorded");
      setDeciding(null); setNote("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Automatic induction for new starters */}
      <div className="rounded-xl border border-border bg-card p-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <GraduationCap className="h-4 w-4 text-primary" /> Send induction to new starters automatically
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Off by default. When on, anyone new with an email address and no induction yet is sent
            their branch documents the next morning. Alcohol-sales authorisation is never included —
            you always send that yourself.
          </p>
        </div>
        <Switch
          checked={prefs?.auto_assign_induction === true}
          onCheckedChange={async (v) => {
            await savePrefs.mutateAsync({
              category: "training_docs",
              preferences: { ...(prefs ?? {}), auto_assign_induction: v },
            });
            toast.success(v ? "New starters will be sent their induction automatically" : "Automatic sending turned off");
          }}
        />
      </div>

      {/* Unfinished inductions */}
      <div className="rounded-xl border border-border bg-card">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-warning" /> Unfinished inductions
          </p>
          <Badge variant="outline" className="text-[10px]">{outstanding.length}</Badge>
        </div>
        {outstanding.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">Everyone has finished their induction.</p>
        ) : (
          <div className="divide-y divide-border">
            {outstanding.map((p: any) => (
              <div key={p.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm truncate">
                    {p.employees ? `${p.employees.forename} ${p.employees.surname}` : nameOf.get(p.employee_id) ?? "Staff member"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {inductionStageLabel(p.stage)} · sent {p.days_outstanding} day{p.days_outstanding === 1 ? "" : "s"} ago
                    {p.reminder_count ? ` · ${p.reminder_count} reminder${p.reminder_count === 1 ? "" : "s"} sent` : ""}
                  </p>
                </div>
                <Badge className={cn("text-[10px] shrink-0", p.days_outstanding >= 14 ? toneClass.amber : toneClass.grey)}>
                  {p.days_outstanding >= 14 ? "Chasing weekly" : "Reminders on"}
                </Badge>
              </div>
            ))}
          </div>
        )}
        <p className="px-4 py-2.5 text-[11px] text-muted-foreground border-t border-border">
          Reminders go out 3, 7 and 14 days after sending, then weekly while outstanding.
        </p>
      </div>

      {/* New versions awaiting a decision */}
      <div className="rounded-xl border border-border bg-card">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <RefreshCw className="h-4 w-4 text-primary" /> New document versions
          </p>
          <Badge variant="outline" className="text-[10px]">{pending.length} to decide</Badge>
        </div>
        {pending.length === 0 && settled.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">
            No new versions yet. When you issue one, the staff who completed the previous version are
            listed here for you to decide what happens.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {[...pending, ...settled].map((r: any) => (
              <div key={r.id} className="px-4 py-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.document_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Version {r.from_version} → {r.to_version} · {r.change_significance === "significant" ? "Content changed" : "Details only"} ·{" "}
                      {r.affected_count} completed the previous version
                    </p>
                    {r.decision_note && <p className="text-xs text-muted-foreground mt-0.5">{r.decision_note}</p>}
                  </div>
                  <Badge className={cn("text-[10px] shrink-0", toneClass[reissueDecisionTone(r.decision)])}>
                    {reissueDecisionLabel(r.decision)}
                  </Badge>
                </div>
                {r.affected_count > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {(r.affected_employee_ids ?? []).slice(0, 6).map((id: string) => nameOf.get(id) ?? "Staff member").join(", ")}
                    {(r.affected_employee_ids ?? []).length > 6 ? ` +${r.affected_employee_ids.length - 6} more` : ""}
                  </p>
                )}
                {r.decision === "pending" && (
                  <Button size="sm" onClick={() => { setDeciding(r); setChoice("acknowledge"); setNote(""); }}>
                    Decide what happens
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="px-4 py-2.5 text-[11px] text-muted-foreground border-t border-border">
          A new version is never sent out on its own, and the version each person already completed is
          kept exactly as it was.
        </p>
      </div>

      <Dialog open={!!deciding} onOpenChange={(o) => !o && setDeciding(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New version of {deciding?.document_name}</DialogTitle>
            <DialogDescription>
              {deciding?.affected_count} staff completed version {deciding?.from_version}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {([
              ["retrain", "Full retraining", "Send the whole induction again for this document."],
              ["acknowledge", "Read and acknowledge", "Ask them to read the new version and sign it."],
              ["no_action", "No action needed", "A small change — nobody needs to do anything."],
            ] as const).map(([value, title, help]) => (
              <button
                key={value}
                type="button"
                onClick={() => setChoice(value)}
                className={cn(
                  "w-full text-left rounded-lg border px-3 py-2.5",
                  choice === value ? "border-primary bg-primary/5" : "border-border"
                )}
              >
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-muted-foreground">{help}</p>
              </button>
            ))}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs">Note (kept on the record)</Label>
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <p className="text-[11px] text-muted-foreground">
              This records your decision. Sending the induction or acknowledgement is still done from
              Staff induction, so you choose exactly who receives it.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeciding(null)}>Cancel</Button>
            <Button onClick={submitDecision} disabled={busy}>{busy ? "Saving..." : "Record decision"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
