import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ClipboardCheck, Plus, Printer, Mail, Upload, CheckCircle2, AlertTriangle, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  useInspectionChecklist, useSeedInspectionChecklist, useUpdateChecklistItem,
  useComplianceActions, useSaveComplianceAction, useBranchComplianceItems,
  uploadComplianceFile, complianceFileUrl,
} from "@/hooks/useCompliance";
import { summariseInspectionReadiness, checklistTone, documentTone } from "@/lib/inspection-readiness";
import { expiryLabel } from "@/lib/compliance-expiry";
import { useTenant } from "@/hooks/useTenant";
import { cn } from "@/lib/utils";

const toneClass: Record<string, string> = {
  red: "bg-destructive/10 text-destructive",
  amber: "bg-warning/10 text-warning",
  green: "bg-success/10 text-success",
  grey: "bg-muted text-muted-foreground",
};

const CHECKLIST_STATUSES = ["ready", "action_needed", "missing", "not_applicable"] as const;

export function InspectionFileSection({ branch }: { branch: string }) {
  const { tenantId, tenantName } = useTenant();
  const { data: checklist = [], isLoading } = useInspectionChecklist(branch);
  const { data: actions = [] } = useComplianceActions(branch);
  const { data: documents = [] } = useBranchComplianceItems(branch);
  const seed = useSeedInspectionChecklist();
  const updateItem = useUpdateChecklistItem();
  const saveAction = useSaveComplianceAction();

  const [actionOpen, setActionOpen] = useState(false);
  const [actionTitle, setActionTitle] = useState("");
  const [actionDetail, setActionDetail] = useState("");
  const [actionDue, setActionDue] = useState("");
  const [savingAction, setSavingAction] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailNote, setEmailNote] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  const readiness = useMemo(
    () => summariseInspectionReadiness(checklist as any[], documents as any[]),
    [checklist, documents]
  );
  const openActions = actions.filter((a: any) => a.status !== "completed");

  const summaryHtml = useMemo(() => {
    const rows = [
      ...(checklist as any[]).map(c => `<li><strong>${c.label}</strong> — ${String(c.status).replace(/_/g, " ")}${c.displayed ? " (displayed)" : ""}</li>`),
      ...(documents as any[]).map(d => `<li>${d.name}${d.expiry_date ? ` — ${expiryLabel(d.expiry_date)}` : ""}${d.is_displayed ? " (displayed)" : ""}</li>`),
      ...openActions.map((a: any) => `<li>Outstanding action: ${a.title}${a.due_date ? ` (due ${a.due_date})` : ""}</li>`),
    ];
    return `<ul>${rows.join("")}</ul>`;
  }, [checklist, documents, openActions]);

  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) { toast.error("Allow pop-ups to download the pack"); return; }
    w.document.write(`
      <html><head><title>Inspection file — ${branch}</title>
      <style>body{font-family:sans-serif;padding:32px;color:#111}h1{font-size:20px}li{margin:4px 0;font-size:14px}</style>
      </head><body>
      <h1>${tenantName ?? ""} — ${branch} inspection file</h1>
      <p>Generated ${new Date().toLocaleString("en-GB")}</p>
      ${summaryHtml}
      </body></html>`);
    w.document.close();
    w.print();
  };

  const handleEmail = async () => {
    if (!emailTo.includes("@")) { toast.error("Enter a valid email address"); return; }
    setSendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke("send-notification", {
        body: {
          to: emailTo,
          subject: `Inspection file — ${branch}`,
          type: "inspection_pack",
          tenant_id: tenantId,
          data: { branch, intro: emailNote || "", summary_html: summaryHtml },
        },
      });
      if (error) throw error;
      toast.success("Inspection file summary sent");
      setEmailOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleEvidence = async (action: any, file: File) => {
    if (!tenantId) return;
    setUploadingFor(action.id);
    try {
      const path = await uploadComplianceFile(file, tenantId, `actions/${branch}`);
      await saveAction.mutateAsync({
        id: action.id,
        evidence_file_path: path,
        status: "completed",
        completed_at: new Date().toISOString(),
      });
      toast.success("Evidence uploaded and action marked complete");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploadingFor(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold">{branch} inspection file</p>
          <Badge className={cn("text-[10px]", toneClass[readiness.tone])}>
            {readiness.tone === "green" ? "Ready" : readiness.tone === "amber" ? "Attention soon" : readiness.tone === "red" ? "Not ready" : "Not set up"}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5 mr-1.5" /> Download pack
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEmailOpen(true)}>
            <Mail className="h-3.5 w-3.5 mr-1.5" /> Email pack
          </Button>
        </div>
      </div>

      {readiness.outstanding.length > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-3">
          <p className="text-xs font-semibold text-warning flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Needs attention
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {readiness.outstanding.map((o, i) => (
              <li key={i} className="text-xs text-muted-foreground">{o}</li>
            ))}
          </ul>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Loading...</p>
      ) : checklist.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-3">
          <p className="text-sm font-medium">No checklist for {branch} yet</p>
          <p className="text-xs text-muted-foreground">
            Start from the standard licensing checklist — every line can be edited to suit this branch and council.
          </p>
          <Button size="sm" onClick={async () => { await seed.mutateAsync(branch); toast.success("Checklist created"); }}>
            Create checklist
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {(checklist as any[]).map(item => (
            <div key={item.id} className="px-4 py-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  {item.detail && <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>}
                </div>
                <Badge className={cn("text-[10px] shrink-0", toneClass[checklistTone(item.status)])}>
                  {String(item.status).replace(/_/g, " ")}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Select
                  value={item.status}
                  onValueChange={(v) => updateItem.mutate({ id: item.id, updates: { status: v, last_reviewed_at: new Date().toISOString() } })}
                >
                  <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHECKLIST_STATUSES.map(s => (
                      <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-2 text-xs">
                  <Switch
                    checked={!!item.displayed}
                    onCheckedChange={(v) => updateItem.mutate({ id: item.id, updates: { displayed: v } })}
                  />
                  Displayed
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <Switch
                    checked={!!item.physical_copy_held}
                    onCheckedChange={(v) => updateItem.mutate({ id: item.id, updates: { physical_copy_held: v } })}
                  />
                  Physical copy
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Inspection actions</p>
          <Button size="sm" variant="outline" onClick={() => setActionOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add action
          </Button>
        </div>
        {actions.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No actions recorded.</p>
        ) : (
          <div className="divide-y divide-border">
            {(actions as any[]).map(a => (
              <div key={a.id} className="px-4 py-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{a.title}</p>
                    {a.detail && <p className="text-xs text-muted-foreground mt-0.5">{a.detail}</p>}
                    {a.due_date && <p className="text-xs text-muted-foreground">Due {a.due_date}</p>}
                  </div>
                  {a.status === "completed" ? (
                    <Badge className="text-[10px] bg-success/10 text-success">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
                    </Badge>
                  ) : (
                    <Badge className="text-[10px] bg-warning/10 text-warning">Open</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {a.status !== "completed" && (
                    <label className="inline-flex items-center gap-1.5 text-xs rounded-md border border-border px-2.5 py-1.5 cursor-pointer">
                      {uploadingFor === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      Upload evidence and complete
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleEvidence(a, f);
                        }}
                      />
                    </label>
                  )}
                  {a.evidence_file_path && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        const url = await complianceFileUrl(a.evidence_file_path);
                        if (url) window.open(url, "_blank");
                      }}
                    >
                      View evidence
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add inspection action</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>What needs doing?</Label>
              <Input value={actionTitle} onChange={(e) => setActionTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Detail or note</Label>
              <Textarea rows={2} value={actionDetail} onChange={(e) => setActionDetail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Due date</Label>
              <Input type="date" value={actionDue} onChange={(e) => setActionDue(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionOpen(false)}>Cancel</Button>
            <Button
              disabled={savingAction}
              onClick={async () => {
                if (!actionTitle.trim()) { toast.error("Describe the action"); return; }
                setSavingAction(true);
                try {
                  await saveAction.mutateAsync({
                    branch, title: actionTitle, detail: actionDetail || null,
                    due_date: actionDue || null, source: "inspection", status: "open",
                  });
                  toast.success("Action added");
                  setActionOpen(false); setActionTitle(""); setActionDetail(""); setActionDue("");
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setSavingAction(false);
                }
              }}
            >
              {savingAction ? "Saving..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Email the inspection file</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Send to</Label>
              <Input value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="name@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Message (optional)</Label>
              <Textarea rows={2} value={emailNote} onChange={(e) => setEmailNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailOpen(false)}>Cancel</Button>
            <Button onClick={handleEmail} disabled={sendingEmail}>{sendingEmail ? "Sending..." : "Send"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
