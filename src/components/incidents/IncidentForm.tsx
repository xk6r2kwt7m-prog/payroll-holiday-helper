import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AlertTriangle, Camera, Loader2, Save, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  INCIDENT_CATEGORIES, categoryLabel, conditionalFields, missingRequired,
  requiresLicenceRecord, deadlineState, deadlineMessage, defaultConfidentiality,
  confidentialityLabel, incidentLogConditionSource,
} from "@/lib/incident-categories";
import { useSaveIncident, useAddIncidentEvidence, type IncidentRow } from "@/hooks/useIncidents";
import { useComplianceBranches } from "@/hooks/useComplianceBranches";

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export interface IncidentFormProps {
  existing?: IncidentRow | null;
  reporterName?: string | null;
  reporterEmployeeId?: string | null;
  defaultBranch?: string | null;
  onDone?: () => void;
}

/**
 * The short mobile-first report form. Staff can save a draft and come back;
 * once submitted the report is read-only to them.
 */
export function IncidentForm({
  existing, reporterName, reporterEmployeeId, defaultBranch, onDone,
}: IncidentFormProps) {
  const { data: branchData } = useComplianceBranches();
  const branches = branchData?.selectable ?? [];
  const save = useSaveIncident();
  const addEvidence = useAddIncidentEvidence();

  const [form, setForm] = useState<Record<string, any>>(() => ({
    branch: existing?.branch ?? defaultBranch ?? "",
    category: existing?.category ?? "",
    incident_date: existing?.incident_date ?? new Date().toISOString().slice(0, 10),
    incident_time: existing?.incident_time ?? nowTime(),
    location_detail: existing?.location_detail ?? "",
    people_involved: existing?.people_involved ?? "",
    description: existing?.description ?? "",
    immediate_action: existing?.immediate_action ?? "",
    manager_notified: existing?.manager_notified ?? false,
    manager_notified_name: existing?.manager_notified_name ?? "",
    evidence_available: existing?.evidence_available ?? false,
    details: existing?.details ?? {},
  }));
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState<"draft" | "submit" | null>(null);

  const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));
  const setDetail = (key: string, value: any) =>
    setForm((f) => ({ ...f, details: { ...(f.details ?? {}), [key]: value } }));

  const extras = useMemo(() => conditionalFields(form.category), [form.category]);
  const missing = missingRequired(form);
  const licenceRequired = requiresLicenceRecord(form.category);
  const dState = deadlineState({
    category: form.category, status: existing?.status ?? "draft",
    incident_date: form.incident_date, incident_time: form.incident_time,
  });
  const dMessage = deadlineMessage(dState);

  async function persist(submit: boolean) {
    if (submit && missing.length > 0) {
      toast.error(`Still needed: ${missing.join(", ")}`);
      return;
    }
    setBusy(submit ? "submit" : "draft");
    try {
      const saved: any = await save.mutateAsync({
        values: {
          id: existing?.id,
          ...form,
          reported_by_name: existing?.reported_by_name ?? reporterName ?? null,
          reported_by_employee_id: existing?.reported_by_employee_id ?? reporterEmployeeId ?? null,
          confidentiality: existing?.confidentiality ?? defaultConfidentiality(form.category),
        } as any,
        submit,
      });
      if (pendingFiles.length > 0 && saved?.id) {
        for (const file of pendingFiles) {
          await addEvidence.mutateAsync({ incidentId: saved.id, file });
        }
        setPendingFiles([]);
      }
      toast.success(
        submit
          ? `Report ${saved?.report_number ?? ""} submitted — your manager has it now`.trim()
          : "Draft saved — you can finish it later"
      );
      onDone?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save the report");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {dMessage && (
        <div className={cn(
          "flex items-start gap-2 rounded-lg border p-3 text-xs",
          dState === "overdue" ? "border-destructive/40 bg-destructive/5 text-destructive"
            : dState === "urgent" ? "border-destructive/30 bg-destructive/5"
            : "border-warning/40 bg-warning/5"
        )}>
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>{dMessage}</p>
        </div>
      )}

      <div className="space-y-2">
        <Label>Branch</Label>
        <Select value={form.branch} onValueChange={(v) => set("branch", v)}>
          <SelectTrigger><SelectValue placeholder="Where did it happen?" /></SelectTrigger>
          <SelectContent>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.branch}>{b.display_name || b.branch}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Date</Label>
          <Input type="date" value={form.incident_date ?? ""} onChange={(e) => set("incident_date", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Time</Label>
          <Input type="time" value={form.incident_time ?? ""} onChange={(e) => set("incident_time", e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Exactly where</Label>
        <Input
          placeholder="e.g. kitchen pass, front door, customer toilets"
          value={form.location_detail ?? ""}
          onChange={(e) => set("location_detail", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>What kind of incident</Label>
        <Select value={form.category} onValueChange={(v) => set("category", v)}>
          <SelectTrigger><SelectValue placeholder="Choose the closest match" /></SelectTrigger>
          <SelectContent className="max-h-72">
            {INCIDENT_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {licenceRequired && (
          <p className="text-[11px] text-warning">
            {incidentLogConditionSource(form.branch)} requires this to be recorded within 24 hours of the incident.
          </p>
        )}
        {form.category && (
          <p className="text-[11px] text-muted-foreground">
            Kept as: {confidentialityLabel(existing?.confidentiality ?? defaultConfidentiality(form.category))}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>People involved</Label>
        <Input
          placeholder="Names or descriptions"
          value={form.people_involved ?? ""}
          onChange={(e) => set("people_involved", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>What happened</Label>
        <Textarea
          rows={4}
          placeholder="Stick to the facts, in the order they happened"
          value={form.description ?? ""}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>What you did straight away</Label>
        <Textarea
          rows={3}
          value={form.immediate_action ?? ""}
          onChange={(e) => set("immediate_action", e.target.value)}
        />
      </div>

      {extras.length > 0 && (
        <div className="rounded-xl border border-border p-3 space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {categoryLabel(form.category)} — extra details
          </p>
          {extras.map((f) => (
            <div key={f.key} className="space-y-2">
              {f.type === "yesno" ? (
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-sm font-normal">{f.label}</Label>
                  <Switch
                    checked={!!form.details?.[f.key]}
                    onCheckedChange={(v) => setDetail(f.key, v)}
                  />
                </div>
              ) : f.type === "select" ? (
                <>
                  <Label>{f.label}</Label>
                  <Select
                    value={form.details?.[f.key] ?? ""}
                    onValueChange={(v) => setDetail(f.key, v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                    <SelectContent>
                      {(f.options ?? []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </>
              ) : f.type === "textarea" ? (
                <>
                  <Label>{f.label}</Label>
                  <Textarea
                    rows={3}
                    value={form.details?.[f.key] ?? ""}
                    onChange={(e) => setDetail(f.key, e.target.value)}
                  />
                </>
              ) : (
                <>
                  <Label>{f.label}</Label>
                  <Input
                    type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                    value={form.details?.[f.key] ?? ""}
                    onChange={(e) =>
                      setDetail(f.key, f.type === "number" ? Number(e.target.value) : e.target.value)
                    }
                  />
                </>
              )}
              {f.help && <p className="text-[11px] text-muted-foreground">{f.help}</p>}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3 rounded-xl border border-border p-3">
        <div className="flex items-center justify-between gap-3">
          <Label className="text-sm font-normal">Did you tell a manager?</Label>
          <Switch checked={!!form.manager_notified} onCheckedChange={(v) => set("manager_notified", v)} />
        </div>
        {form.manager_notified && (
          <Input
            placeholder="Which manager?"
            value={form.manager_notified_name ?? ""}
            onChange={(e) => set("manager_notified_name", e.target.value)}
          />
        )}
        <div className="flex items-center justify-between gap-3">
          <Label className="text-sm font-normal">Is there evidence (photos, till record, CCTV)?</Label>
          <Switch checked={!!form.evidence_available} onCheckedChange={(v) => set("evidence_available", v)} />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-normal">Add photos or files</Label>
          <label className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted-foreground cursor-pointer">
            <Camera className="h-4 w-4" />
            Take a photo or choose a file
            <input
              type="file"
              accept="image/*,application/pdf"
              multiple
              capture="environment"
              className="hidden"
              onChange={(e) => setPendingFiles(Array.from(e.target.files ?? []))}
            />
          </label>
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {pendingFiles.map((f) => (
                <Badge key={f.name} variant="secondary" className="text-[10px]">{f.name}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {missing.length > 0 && (
        <p className="text-xs text-muted-foreground">Still needed before submitting: {missing.join(", ")}</p>
      )}

      <div className="flex gap-2 sticky bottom-0 bg-background pt-2 pb-1">
        <Button variant="outline" className="flex-1" disabled={!!busy} onClick={() => persist(false)}>
          {busy === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Save draft
        </Button>
        <Button className="flex-1" disabled={!!busy || missing.length > 0} onClick={() => persist(true)}>
          {busy === "submit" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
          Submit
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Once submitted you cannot change or delete the report. If something needs correcting, tell your
        manager — the original stays on record with a dated correction.
      </p>
    </div>
  );
}
