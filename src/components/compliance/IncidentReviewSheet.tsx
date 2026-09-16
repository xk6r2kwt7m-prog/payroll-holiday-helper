import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { pdf } from "@react-pdf/renderer";
import { AlertTriangle, Download, FileText, Loader2, Paperclip, Plus } from "lucide-react";
import {
  categoryLabel, statusLabel, confidentialityLabel, conditionalFields,
  CONFIDENTIALITY_LEVELS, INCIDENT_STATUSES, riddorWorthChecking, deadlineState, deadlineMessage,
} from "@/lib/incident-categories";
import {
  useIncidentAmendments, useIncidentEvidence, useWitnessStatements, useAddWitnessStatement,
  useAddIncidentEvidence, useAmendIncident, useUpdateIncidentInvestigation, useLogIncidentView,
  type IncidentRow,
} from "@/hooks/useIncidents";
import { useComplianceAuditTrail, complianceFileUrl } from "@/hooks/useCompliance";
import { COMPLIANCE_AUDIT_LABELS } from "@/lib/compliance-audit-events";
import { IncidentPDF } from "@/components/incidents/IncidentPDF";

const AMENDABLE_FIELDS: { key: string; label: string; type: "text" | "textarea" | "date" | "time" }[] = [
  { key: "incident_date", label: "Date of the incident", type: "date" },
  { key: "incident_time", label: "Time of the incident", type: "time" },
  { key: "location_detail", label: "Where it happened", type: "text" },
  { key: "people_involved", label: "People involved", type: "text" },
  { key: "description", label: "What happened", type: "textarea" },
  { key: "immediate_action", label: "Immediate action taken", type: "textarea" },
];

export function IncidentReviewSheet({
  incident, open, onOpenChange,
}: { incident: IncidentRow | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const logView = useLogIncidentView();

  useEffect(() => {
    if (open && incident) logView.mutate({ id: incident.id, branch: incident.branch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, incident?.id]);

  if (!incident) return null;
  const dState = deadlineState(incident);
  const dMessage = deadlineMessage(dState);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[94vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">
            {incident.report_number ?? "Draft"} · {categoryLabel(incident.category)}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-[10px]">{statusLabel(incident.status)}</Badge>
          <Badge variant="secondary" className="text-[10px]">{confidentialityLabel(incident.confidentiality)}</Badge>
          {incident.licence_condition_28 && (
            <Badge variant="outline" className="text-[10px]">Premises licence record</Badge>
          )}
          {riddorWorthChecking(incident.category, incident.details) && (
            <Badge variant="outline" className="text-[10px] border-warning text-warning">RIDDOR check</Badge>
          )}
        </div>

        {dMessage && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/5 p-3 text-xs">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-warning" />
            <p>{dMessage}</p>
          </div>
        )}

        <Tabs defaultValue="report" className="mt-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="report">Report</TabsTrigger>
            <TabsTrigger value="investigation">Investigation</TabsTrigger>
            <TabsTrigger value="evidence">Evidence</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="report" className="space-y-4 pt-3">
            <ReportFacts incident={incident} />
            <AmendPanel incident={incident} />
            <ExportButton incident={incident} />
          </TabsContent>

          <TabsContent value="investigation" className="pt-3">
            <InvestigationPanel incident={incident} />
          </TabsContent>

          <TabsContent value="evidence" className="space-y-5 pt-3">
            <EvidencePanel incident={incident} />
            <WitnessPanel incident={incident} />
          </TabsContent>

          <TabsContent value="history" className="space-y-4 pt-3">
            <AmendmentHistory incident={incident} />
            <AuditHistory incident={incident} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function Fact({ label, value }: { label: string; value?: any }) {
  const text =
    value === true ? "Yes" : value === false ? "No" :
    value === null || value === undefined || value === "" ? "—" : String(value);
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm whitespace-pre-wrap">{text}</p>
    </div>
  );
}

function ReportFacts({ incident }: { incident: IncidentRow }) {
  const extras = conditionalFields(incident.category);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Fact label="Branch" value={incident.branch} />
        <Fact label="Date and time of incident" value={`${incident.incident_date ?? "—"} ${incident.incident_time ?? ""}`.trim()} />
        <Fact label="Submitted" value={incident.submitted_at ? new Date(incident.submitted_at).toLocaleString() : "Not submitted"} />
        <Fact label="Reported by" value={incident.reported_by_name} />
      </div>
      <Fact label="Exactly where" value={incident.location_detail} />
      <Fact label="People involved" value={incident.people_involved} />
      <Fact label="What happened" value={incident.description} />
      <Fact label="Immediate action" value={incident.immediate_action} />
      <Fact label="Manager notified" value={incident.manager_notified ? incident.manager_notified_name || "Yes" : "No"} />
      {extras.length > 0 && (
        <div className="rounded-xl border border-border p-3 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {categoryLabel(incident.category)} details
          </p>
          {extras.map((f) => <Fact key={f.key} label={f.label} value={incident.details?.[f.key]} />)}
        </div>
      )}
    </div>
  );
}

/** Corrections keep the original entry and record who changed what and why. */
function AmendPanel({ incident }: { incident: IncidentRow }) {
  const amend = useAmendIncident();
  const [field, setField] = useState(AMENDABLE_FIELDS[0].key);
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);

  const def = AMENDABLE_FIELDS.find((f) => f.key === field)!;

  if (incident.status === "draft") {
    return <p className="text-xs text-muted-foreground">This report is still a draft with the person who started it.</p>;
  }

  return (
    <div className="rounded-xl border border-border p-3 space-y-3">
      {!open ? (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Record a correction</Button>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            The original entry is kept. Your correction is stored separately with the date, your name and the reason.
          </p>
          <div className="space-y-2">
            <Label>What is being corrected</Label>
            <Select value={field} onValueChange={(v) => { setField(v); setValue(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {AMENDABLE_FIELDS.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Corrected information</Label>
            {def.type === "textarea" ? (
              <Textarea rows={3} value={value} onChange={(e) => setValue(e.target.value)} />
            ) : (
              <Input type={def.type === "date" ? "date" : def.type === "time" ? "time" : "text"}
                value={value} onChange={(e) => setValue(e.target.value)} />
            )}
            <p className="text-[11px] text-muted-foreground">
              Currently: {String((incident as any)[field] ?? "—")}
            </p>
          </div>
          <div className="space-y-2">
            <Label>Why</Label>
            <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              disabled={amend.isPending || !reason.trim() || !value.trim()}
              onClick={async () => {
                try {
                  await amend.mutateAsync({ incident, updates: { [field]: value }, reason });
                  toast.success("Correction recorded — the original entry is preserved");
                  setOpen(false); setReason(""); setValue("");
                } catch (e: any) {
                  toast.error(e?.message ?? "Could not record the correction");
                }
              }}
            >
              Save correction
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function InvestigationPanel({ incident }: { incident: IncidentRow }) {
  const update = useUpdateIncidentInvestigation();
  const [form, setForm] = useState<Record<string, any>>({
    status: incident.status,
    confidentiality: incident.confidentiality,
    review_notes: incident.review_notes ?? "",
    findings: incident.findings ?? "",
    root_cause: incident.root_cause ?? "",
    immediate_controls: incident.immediate_controls ?? "",
    riddor_flagged: incident.riddor_flagged ?? false,
    riddor_assessment: incident.riddor_assessment ?? "",
    insurance_notified: incident.insurance_notified ?? false,
    authority_notified: incident.authority_notified ?? false,
    authority_reference: incident.authority_reference ?? "",
    training_required: incident.training_required ?? "",
    responsible_job_title: incident.responsible_job_title ?? "",
    responsible_person: incident.responsible_person ?? "",
    action_deadline: incident.action_deadline ?? "",
    outcome: incident.outcome ?? "",
    manager_signature: incident.manager_signature ?? "",
  });
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const closed = incident.status === "closed";

  return (
    <div className="space-y-4">
      {riddorWorthChecking(incident.category, incident.details) && (
        <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 text-xs">
          The circumstances suggest a RIDDOR review. The app flags this only — you decide whether it is
          legally reportable.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => set("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {INCIDENT_STATUSES.filter((s) => s.value !== "draft").map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Confidentiality</Label>
          <Select value={form.confidentiality} onValueChange={(v) => set("confidentiality", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CONFIDENTIALITY_LEVELS.map((l) => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {[
        ["review_notes", "Initial review"],
        ["findings", "Findings"],
        ["root_cause", "Root cause"],
        ["immediate_controls", "Immediate controls put in place"],
        ["training_required", "Training required"],
        ["outcome", "Final outcome"],
      ].map(([key, label]) => (
        <div key={key} className="space-y-2">
          <Label>{label}</Label>
          <Textarea rows={3} value={form[key] ?? ""} onChange={(e) => set(key, e.target.value)} />
        </div>
      ))}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Responsible person</Label>
          <Input value={form.responsible_person} onChange={(e) => set("responsible_person", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Their job title</Label>
          <Input value={form.responsible_job_title} onChange={(e) => set("responsible_job_title", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Completion deadline</Label>
          <Input type="date" value={form.action_deadline ?? ""} onChange={(e) => set("action_deadline", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Authority reference</Label>
          <Input value={form.authority_reference} onChange={(e) => set("authority_reference", e.target.value)} />
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-border p-3">
        {[
          ["riddor_flagged", "Flag for RIDDOR review"],
          ["insurance_notified", "Insurer notified"],
          ["authority_notified", "Authority notified"],
        ].map(([key, label]) => (
          <div key={key} className="flex items-center justify-between gap-3">
            <Label className="text-sm font-normal">{label}</Label>
            <Switch checked={!!form[key]} onCheckedChange={(v) => set(key, v)} />
          </div>
        ))}
        <div className="space-y-2">
          <Label>RIDDOR assessment (your decision and reasoning)</Label>
          <Textarea rows={2} value={form.riddor_assessment} onChange={(e) => set("riddor_assessment", e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Manager sign-off (type your full name)</Label>
        <Input value={form.manager_signature} onChange={(e) => set("manager_signature", e.target.value)} />
      </div>

      {closed && (
        <p className="text-xs text-muted-foreground">
          Closed {incident.closed_at ? new Date(incident.closed_at).toLocaleString() : ""}. Further changes stay on record.
        </p>
      )}

      <Button
        className="w-full"
        disabled={update.isPending || (form.status === "closed" && !form.manager_signature.trim())}
        onClick={async () => {
          try {
            const updates = { ...form, action_deadline: form.action_deadline || null };
            await update.mutateAsync({ incident, updates });
            toast.success(
              form.status === "closed" ? "Investigation closed and recorded" : "Investigation saved"
            );
          } catch (e: any) {
            toast.error(e?.message ?? "Could not save");
          }
        }}
      >
        {update.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
        Save investigation
      </Button>
      {form.status === "closed" && !form.manager_signature.trim() && (
        <p className="text-[11px] text-muted-foreground">Add your sign-off name before closing.</p>
      )}
    </div>
  );
}

function EvidencePanel({ incident }: { incident: IncidentRow }) {
  const { data: files = [] } = useIncidentEvidence(incident.id);
  const add = useAddIncidentEvidence();
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Evidence</p>
      {files.length === 0 && <p className="text-sm text-muted-foreground">Nothing uploaded yet.</p>}
      {files.map((f: any) => (
        <button
          key={f.id}
          className="w-full flex items-center gap-2 rounded-lg border border-border p-2 text-left text-sm active:bg-muted"
          onClick={async () => {
            const url = await complianceFileUrl(f.file_path);
            if (url) window.open(url, "_blank");
            else toast.error("Could not open that file");
          }}
        >
          <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{f.label || f.file_name}</span>
        </button>
      ))}
      <label className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted-foreground cursor-pointer">
        <Plus className="h-4 w-4" /> Add evidence
        <input
          type="file"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              await add.mutateAsync({ incidentId: incident.id, file });
              toast.success("Evidence added");
            } catch (err: any) {
              toast.error(err?.message ?? "Upload failed");
            }
          }}
        />
      </label>
    </div>
  );
}

function WitnessPanel({ incident }: { incident: IncidentRow }) {
  const { data: statements = [] } = useWitnessStatements(incident.id);
  const add = useAddWitnessStatement();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [text, setText] = useState("");
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Witness statements</p>
      {statements.map((w: any) => (
        <div key={w.id} className="rounded-lg border border-border p-2">
          <p className="text-sm font-medium">{w.witness_name}{w.witness_role ? ` · ${w.witness_role}` : ""}</p>
          <p className="text-xs whitespace-pre-wrap text-muted-foreground">{w.statement}</p>
        </div>
      ))}
      <div className="rounded-xl border border-border p-3 space-y-2">
        <Input placeholder="Witness name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Their role (staff, customer…)" value={role} onChange={(e) => setRole(e.target.value)} />
        <Textarea rows={3} placeholder="Their account" value={text} onChange={(e) => setText(e.target.value)} />
        <Button
          size="sm"
          disabled={!name.trim() || add.isPending}
          onClick={async () => {
            await add.mutateAsync({ incidentId: incident.id, witness_name: name, witness_role: role, statement: text });
            setName(""); setRole(""); setText("");
            toast.success("Statement recorded");
          }}
        >
          Add statement
        </Button>
      </div>
    </div>
  );
}

function AmendmentHistory({ incident }: { incident: IncidentRow }) {
  const { data: amendments = [] } = useIncidentAmendments(incident.id);
  if (amendments.length === 0) {
    return <p className="text-sm text-muted-foreground">No corrections have been made.</p>;
  }
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Corrections</p>
      {amendments.map((a: any) => (
        <div key={a.id} className="rounded-lg border border-border p-2 text-xs space-y-1">
          <p className="text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
          <p>Reason: {a.reason}</p>
          {(a.changes ?? []).map((c: any, i: number) => (
            <p key={i} className="text-muted-foreground">
              {c.label}: <span className="line-through">{c.previous}</span> → {c.next}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}

function AuditHistory({ incident }: { incident: IncidentRow }) {
  const { data: entries = [] } = useComplianceAuditTrail("incident_reports", incident.id);
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Full history</p>
      {entries.length === 0 && <p className="text-sm text-muted-foreground">No history yet.</p>}
      {entries.map((e: any) => (
        <div key={e.id} className="rounded-lg border border-border p-2 text-xs">
          <p className="font-medium">
            {(e.new_data?.event_label as string) ??
              COMPLIANCE_AUDIT_LABELS[e.new_data?.event as keyof typeof COMPLIANCE_AUDIT_LABELS] ?? e.action}
          </p>
          <p className="text-muted-foreground">{new Date(e.created_at).toLocaleString()}</p>
          {(e.new_data?.changes ?? []).map((c: any, i: number) => (
            <p key={i} className="text-muted-foreground">{c.label}: {c.previous} → {c.next}</p>
          ))}
          {e.new_data?.note && <p className="text-muted-foreground">Note: {e.new_data.note}</p>}
        </div>
      ))}
    </div>
  );
}

function ExportButton({ incident }: { incident: IncidentRow }) {
  const { data: amendments = [] } = useIncidentAmendments(incident.id);
  const { data: witnesses = [] } = useWitnessStatements(incident.id);
  const { data: evidence = [] } = useIncidentEvidence(incident.id);
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      className="w-full"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const blob = await pdf(
            <IncidentPDF
              incident={incident}
              amendments={amendments as any}
              witnesses={witnesses as any}
              evidence={evidence as any}
            />
          ).toBlob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${incident.report_number ?? "incident"}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        } catch {
          toast.error("Could not build the PDF");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
      Download this incident (PDF)
    </Button>
  );
}
