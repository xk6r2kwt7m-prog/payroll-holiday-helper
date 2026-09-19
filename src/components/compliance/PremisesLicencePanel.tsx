import { useMemo, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  AlertTriangle, Download, FileSignature, Mail, Pencil, Plus, ScrollText, Send, Trash2, Users, XCircle,
} from "lucide-react";
import {
  awaitingConfirmation, buildDpsAuthorisation, buildSection57,
  buildStaffAlcoholAuthorisation, isReadyToSend, requestStatusLabel, requestStatusTone,
  resolveRequestStatus, SUBJECT_LABELS, type LicenceSite, type LicenceSubjectType,
  type NominatedPerson,
} from "@/lib/licensing-documents";
import { LicensingDocumentPDF } from "@/components/compliance/LicensingDocumentPDF";
import {
  useCancelLicenceSignature, useLicenceConditions, useLicenceSignatureRequests,
  usePremisesLicence, useSaveLicenceCondition, useSavePremisesLicence, useSendLicenceSignature,
} from "@/hooks/usePremisesLicences";
import { useAlcoholAuthorisations } from "@/hooks/useCompliance";
import {
  useDpsRegister, useLicenceDocumentIssues, useRecordLicenceDocumentIssue,
  useRevokeLicenceDocumentLink,
} from "@/hooks/useDpsRegister";
import {
  registerPdfRows, registerCsv, DELIVERY_LABELS, linkState, linkStateLabel,
  type DeliveryMethod,
} from "@/lib/dps-register";
import { EmailLicensingDocumentDialog } from "@/components/compliance/EmailLicensingDocumentDialog";
import { cn } from "@/lib/utils";

const toneClass: Record<string, string> = {
  red: "bg-destructive/10 text-destructive",
  amber: "bg-warning/10 text-warning",
  green: "bg-success/10 text-success",
  grey: "bg-muted text-muted-foreground",
};

const REQUIREMENT_CATEGORIES = [
  "Age verification", "CCTV", "Door supervision", "Noise and nuisance",
  "Records and documents", "Training", "Crime and disorder", "Other",
];

const FREQUENCIES = ["Continuous", "Every shift", "Daily", "Weekly", "Monthly", "Quarterly", "Annually", "On request"];

function fieldOrDash(v?: string | null) {
  return (v ?? "").trim() || "—";
}

export function PremisesLicencePanel({ branch }: { branch: string }) {
  const { data: licence, isLoading } = usePremisesLicence(branch);
  const { data: conditions = [] } = useLicenceConditions(licence?.id);
  const { data: requests = [] } = useLicenceSignatureRequests({ branch });
  const { data: authorisations = [] } = useAlcoholAuthorisations();
  const saveLicence = useSavePremisesLicence();
  const saveCondition = useSaveLicenceCondition();
  const sendSignature = useSendLicenceSignature();
  const cancelRequest = useCancelLicenceSignature();
  const recordIssue = useRecordLicenceDocumentIssue();
  const { data: issues = [] } = useLicenceDocumentIssues(branch);
  const revokeLink = useRevokeLicenceDocumentLink();

  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [conditionOpen, setConditionOpen] = useState(false);
  const [condition, setCondition] = useState<Record<string, any>>({});
  const [sendOpen, setSendOpen] = useState<LicenceSubjectType | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [partA, setPartA] = useState("the office folder of the restaurant");
  const [nominated, setNominated] = useState<NominatedPerson[]>([{ name: "", job_title: "" }]);
  const [testSend, setTestSend] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const site: LicenceSite = useMemo(() => ({
    branch,
    premises_name: licence?.premises_name,
    premises_address: licence?.premises_address,
    licence_number: licence?.licence_number,
    licence_holder: licence?.licence_holder,
    issuing_authority: licence?.issuing_authority,
    dps_name: licence?.dps_name,
    dps_personal_licence_number: licence?.dps_personal_licence_number,
  }), [branch, licence]);

  const missing = useMemo(() => awaitingConfirmation(site), [site]);

  // The register: everyone front of house at this site, plus anyone here who
  // already holds an authorisation record. Status comes from their own records.
  const { rows: registerRows, summary: registerTotals, summaryLine } = useDpsRegister(branch);
  const warningLine = outstandingSignatureLine(registerRows, branch);



  const openEdit = () => {
    setForm({
      id: licence?.id,
      branch,
      premises_name: licence?.premises_name ?? "",
      premises_address: licence?.premises_address ?? "",
      licence_number: licence?.licence_number ?? "",
      licence_holder: licence?.licence_holder ?? "",
      issuing_authority: licence?.issuing_authority ?? "",
      issue_date: licence?.issue_date ?? "",
      latest_variation_date: licence?.latest_variation_date ?? "",
      licence_status: licence?.licence_status ?? "active",
      dps_name: licence?.dps_name ?? "",
      dps_personal_licence_number: licence?.dps_personal_licence_number ?? "",
      opening_hours: licence?.opening_hours ?? "",
      alcohol_hours: licence?.alcohol_hours ?? "",
      late_night_refreshment_hours: licence?.late_night_refreshment_hours ?? "",
      on_sales: licence?.on_sales ?? true,
      off_sales: licence?.off_sales ?? false,
      display_required: licence?.display_required ?? true,
      display_location: licence?.display_location ?? "",
      last_physical_check: licence?.last_physical_check ?? "",
      physical_check_by: licence?.physical_check_by ?? "",
      replacement_needed: licence?.replacement_needed ?? false,
      latest_version_printed: licence?.latest_version_printed ?? false,
      last_verified_date: licence?.last_verified_date ?? "",
      verified_by: licence?.verified_by ?? "",
      confirmation_note: licence?.confirmation_note ?? "",
      notes: licence?.notes ?? "",
    });
    setEditOpen(true);
  };

  const handleSaveLicence = async () => {
    setBusy(true);
    try {
      const payload: Record<string, any> = { ...form };
      ["issue_date", "latest_variation_date", "last_physical_check", "last_verified_date"].forEach((k) => {
        if (!payload[k]) payload[k] = null;
      });
      payload.needs_confirmation = awaitingConfirmation({ branch, ...payload }).length > 0;
      await saveLicence.mutateAsync(payload as any);
      toast.success("Licence details saved");
      setEditOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveCondition = async () => {
    if (!licence?.id) { toast.error("Add the licence details first"); return; }
    if (!condition.legal_wording?.trim()) { toast.error("Paste the wording from the licence"); return; }
    setBusy(true);
    try {
      await saveCondition.mutateAsync({
        ...condition,
        licence_id: licence.id,
        branch_location_id: licence.branch_location_id,
        last_check: condition.last_check || null,
        next_check: condition.next_check || null,
      } as any);
      toast.success("Condition saved");
      setConditionOpen(false);
      setCondition({});
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const openSend = (subject: LicenceSubjectType) => {
    setRecipientName(licence?.dps_name ?? "");
    setRecipientEmail("");
    setTestSend(false);
    if (subject === "section_57") {
      setNominated(nominated.length > 0 ? nominated : [{ name: "", job_title: "" }]);
    }
    setSendOpen(subject);
  };

  const handleSend = async () => {
    if (!sendOpen || !licence) return;
    setBusy(true);
    try {
      const res = await sendSignature.mutateAsync({
        subject_type: sendOpen,
        branch,
        licence_id: licence.id,
        recipient_name: recipientName,
        recipient_email: recipientEmail,
        recipient_role: sendOpen === "dps_authorisation" ? "Designated Premises Supervisor" : "Premises licence holder",
        nominated: nominated.filter((n) => n.name.trim() && n.job_title.trim()),
        part_a_location: partA,
        test_send: testSend,
      });
      if (res.failed?.length) toast.error(res.failed.join("; "));
      if ((res.sent ?? 0) > 0) toast.success(testSend ? "Test copy sent to you" : "Sent for signature");
      setSendOpen(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const buildDoc = (subject: LicenceSubjectType, signedRequest: any) =>
    subject === "dps_authorisation"
      ? buildDpsAuthorisation(site, licence?.issue_date ?? null)
      : subject === "section_57"
        ? buildSection57(
            site,
            ((signedRequest?.document_body?.nominated as NominatedPerson[]) ?? nominated).filter((n) => n?.name),
            licence?.issue_date ?? null,
            partA
          )
        : buildStaffAlcoholAuthorisation(site, "", null);

  const auditLineFor = (signedRequest: any) =>
    signedRequest
      ? `Signed electronically by ${signedRequest.signer_name} on ${new Date(signedRequest.signed_at).toLocaleString("en-GB")}. Recorded in UglyOps HR.`
      : "Not yet signed — this is a draft copy.";

  const signedRequestFor = (subject: LicenceSubjectType) =>
    (requests as any[]).find((r) => r.subject_type === subject && r.signed_at);

  const downloadPdf = async (subject: LicenceSubjectType) => {
    const signedRequest = signedRequestFor(subject);
    const doc = buildDoc(subject, signedRequest);
    const isDps = subject === "dps_authorisation";
    const blob = await pdf(
      <LicensingDocumentPDF
        doc={doc}
        staff={isDps ? registerPdfRows(registerRows) : []}
        summaryLine={isDps ? summaryLine : null}
        warningLine={isDps ? warningLine : null}
        authoriserSignature={signedRequest?.signature ?? null}
        authoriserSignedAt={signedRequest?.signed_at ?? null}
        auditLine={auditLineFor(signedRequest)}
      />
    ).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${branch}-${subject}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    if (isDps) {
      // Recorded so the audit trail shows which copy left the building.
      recordIssue.mutate({
        branch,
        licence_id: licence?.id ?? null,
        subject_type: subject,
        snapshot: { document: doc, rows: registerRows, summary_line: summaryLine },
        authorised_count: registerTotals.signed,
        listed_count: registerTotals.covered,

      });
    }
  };


  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-6 text-center">Loading...</p>;
  }

  if (!licence) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-3">
        <ScrollText className="h-7 w-7 text-muted-foreground mx-auto" />
        <div>
          <p className="text-sm font-medium">No premises licence recorded for {branch}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Record the licence details once and this site's licensing documents are produced from them.
          </p>
        </div>
        <Button size="sm" onClick={openEdit}>
          <Plus className="h-4 w-4 mr-1.5" /> Add licence details
        </Button>
        {editOpen && renderEditDialog()}
      </div>
    );
  }

  function renderEditDialog() {
    const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
    return (
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[calc(100dvh-1rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{branch} premises licence</DialogTitle>
            <DialogDescription>
              Leave anything you cannot confirm blank — the screen will show it as awaiting confirmation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Premises name</Label>
              <Input value={form.premises_name ?? ""} onChange={(e) => set("premises_name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Premises address</Label>
              <Input value={form.premises_address ?? ""} onChange={(e) => set("premises_address", e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Licence number</Label>
                <Input value={form.licence_number ?? ""} onChange={(e) => set("licence_number", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Issuing authority</Label>
                <Input value={form.issuing_authority ?? ""} onChange={(e) => set("issuing_authority", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Licence holder</Label>
              <Input value={form.licence_holder ?? ""} onChange={(e) => set("licence_holder", e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Licence date</Label>
                <Input type="date" value={form.issue_date ?? ""} onChange={(e) => set("issue_date", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Latest variation</Label>
                <Input type="date" value={form.latest_variation_date ?? ""} onChange={(e) => set("latest_variation_date", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>DPS name</Label>
                <Input value={form.dps_name ?? ""} onChange={(e) => set("dps_name", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>DPS personal licence</Label>
                <Input value={form.dps_personal_licence_number ?? ""} onChange={(e) => set("dps_personal_licence_number", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Opening hours</Label>
              <Input value={form.opening_hours ?? ""} onChange={(e) => set("opening_hours", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Alcohol hours</Label>
              <Input value={form.alcohol_hours ?? ""} onChange={(e) => set("alcohol_hours", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Late-night refreshment hours</Label>
              <Input value={form.late_night_refreshment_hours ?? ""} onChange={(e) => set("late_night_refreshment_hours", e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <Switch checked={!!form.on_sales} onCheckedChange={(v) => set("on_sales", v)} /> On sales
              </label>
              <label className="flex items-center gap-2">
                <Switch checked={!!form.off_sales} onCheckedChange={(v) => set("off_sales", v)} /> Off sales
              </label>
            </div>

            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground pt-2">
              Physical display check
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <Switch checked={!!form.display_required} onCheckedChange={(v) => set("display_required", v)} /> Display required
              </label>
              <label className="flex items-center gap-2">
                <Switch checked={!!form.latest_version_printed} onCheckedChange={(v) => set("latest_version_printed", v)} /> Latest version printed
              </label>
              <label className="flex items-center gap-2">
                <Switch checked={!!form.replacement_needed} onCheckedChange={(v) => set("replacement_needed", v)} /> Replacement needed
              </label>
            </div>
            <div className="space-y-1.5">
              <Label>Where it is displayed</Label>
              <Input value={form.display_location ?? ""} onChange={(e) => set("display_location", e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Last physical check</Label>
                <Input type="date" value={form.last_physical_check ?? ""} onChange={(e) => set("last_physical_check", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Checked by</Label>
                <Input value={form.physical_check_by ?? ""} onChange={(e) => set("physical_check_by", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Last verified</Label>
                <Input type="date" value={form.last_verified_date ?? ""} onChange={(e) => set("last_verified_date", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Verified by</Label>
                <Input value={form.verified_by ?? ""} onChange={(e) => set("verified_by", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Confirmation note</Label>
              <Textarea rows={2} value={form.confirmation_note ?? ""} onChange={(e) => set("confirmation_note", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveLicence} disabled={busy}>{busy ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const dpsRequests = (requests as any[]).filter((r) => r.subject_type !== "staff_alcohol");

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <ScrollText className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">Premises licence — {branch}</p>
              <p className="text-xs text-muted-foreground truncate">
                {fieldOrDash(licence.licence_number)} · {fieldOrDash(licence.issuing_authority)}
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={openEdit}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
          </Button>
        </div>

        {missing.length > 0 && (
          <div className="px-4 py-3 bg-warning/5 border-b border-warning/30 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium">Awaiting confirmation</p>
              <p className="text-xs text-muted-foreground">{missing.join(", ")}</p>
            </div>
          </div>
        )}

        <div className="px-4 py-3 grid gap-x-4 gap-y-2 sm:grid-cols-2 text-xs">
          <Fact label="Premises" value={licence.premises_name} />
          <Fact label="Address" value={licence.premises_address} />
          <Fact label="Licence holder" value={licence.licence_holder} />
          <Fact label="DPS" value={licence.dps_name} />
          <Fact label="DPS personal licence" value={licence.dps_personal_licence_number} />
          <Fact label="Licence date" value={licence.issue_date} />
          <Fact label="Latest variation" value={licence.latest_variation_date} />
          <Fact label="Alcohol hours" value={licence.alcohol_hours} />
          <Fact label="Opening hours" value={licence.opening_hours} />
          <Fact label="Displayed at" value={licence.display_location} />
          <Fact label="Last physical check" value={licence.last_physical_check} />
          <Fact label="Checked by" value={licence.physical_check_by} />
        </div>

        {licence.confirmation_note && (
          <p className="px-4 pb-3 text-xs text-muted-foreground">{licence.confirmation_note}</p>
        )}

        {licence.display_required && (
          <p className="px-4 pb-3 text-xs text-muted-foreground">
            A physical copy must be displayed at the premises. Storing it here does not replace the display requirement.
          </p>
        )}
      </div>

      {/* Licensing documents and signatures */}
      <div className="rounded-xl border border-border bg-card">
        <div className="px-4 py-2.5 border-b border-border">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Licensing documents
          </p>
        </div>
        <div className="divide-y divide-border">
          {(["dps_authorisation", "section_57"] as LicenceSubjectType[]).map((subject) => {
            const latest = dpsRequests.find((r) => r.subject_type === subject);
            const status = latest ? resolveRequestStatus(latest) : null;
            const ready = isReadyToSend(site, subject);
            return (
              <div key={subject} className="px-4 py-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{SUBJECT_LABELS[subject]}</p>
                    <p className="text-xs text-muted-foreground">
                      {latest
                        ? `${latest.recipient_name}${latest.signed_at ? ` · ${new Date(latest.signed_at).toLocaleDateString("en-GB")}` : ""}`
                        : "Not sent yet"}
                    </p>
                  </div>
                  {status && (
                    <Badge className={cn("text-[10px] shrink-0", toneClass[requestStatusTone(status)])}>
                      {requestStatusLabel(status)}
                    </Badge>
                  )}
                </div>
                {subject === "dps_authorisation" && (
                  <div className="rounded-md border border-border bg-muted/30 p-2.5 space-y-1.5">
                    <p className="text-xs flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{summaryLine}</span>
                    </p>
                    {warningLine && <p className="text-xs text-warning">{warningLine}</p>}
                    {registerRows.length > 0 && (
                      <div className="space-y-0.5">
                        {registerRows.slice(0, 6).map((r) => (
                          <p key={r.employee_id} className="text-[11px] text-muted-foreground">
                            {r.name}{r.role ? ` · ${r.role}` : ""} — {r.status_label}
                          </p>
                        ))}
                        {registerRows.length > 6 && (
                          <p className="text-[11px] text-muted-foreground">
                            and {registerRows.length - 6} more on the document
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {!ready && (
                  <p className="text-xs text-warning">
                    Confirm the licence details above before sending this for signature.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => openSend(subject)} disabled={!ready}>
                    <Send className="h-3.5 w-3.5 mr-1.5" /> Send for signature
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => downloadPdf(subject)}>
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    {subject === "dps_authorisation" ? "Download document" : "PDF"}
                  </Button>
                  {subject === "dps_authorisation" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setEmailOpen(true)}>
                        <Mail className="h-3.5 w-3.5 mr-1.5" /> Email a copy
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const csv = registerCsv(registerRows, branch);
                          const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `${branch}-alcohol-register.csv`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        Register CSV
                      </Button>
                    </>
                  )}
                  {latest && !latest.signed_at && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await cancelRequest.mutateAsync(latest.id);
                        toast.success("Request cancelled");
                      }}
                    >
                      Cancel request
                    </Button>
                  )}
                </div>
                {latest?.declined_note && (
                  <p className="text-xs text-muted-foreground">
                    Not ready to sign: {latest.declined_note}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Issued copies */}
      {issues.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-2.5 bg-muted/40 border-b border-border">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Copies issued
            </p>
          </div>
          <div className="divide-y divide-border">
            {(issues as any[]).map((issue) => {
              const state = linkState(issue);
              return (
                <div key={issue.id} className="px-4 py-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm truncate">
                      {issue.recipient_email || "Downloaded copy"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(issue.created_at).toLocaleString("en-GB")} ·{" "}
                      {DELIVERY_LABELS[issue.delivery_method as DeliveryMethod] ?? issue.delivery_method} ·{" "}
                      {issue.authorised_count} of {issue.listed_count} signed
                      {issue.open_count ? ` · opened ${issue.open_count}×` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="outline" className="text-[10px]">{linkStateLabel(state)}</Badge>
                    {state === "live" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await revokeLink.mutateAsync(issue.id);
                          toast.success("Link withdrawn");
                        }}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Withdraw
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <EmailLicensingDocumentDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        branch={branch}
        licenceId={licence?.id ?? null}
        doc={buildDoc("dps_authorisation", signedRequestFor("dps_authorisation"))}
        rows={registerRows}
        summaryLine={summaryLine}
        warningLine={warningLine}
        authoriserSignature={signedRequestFor("dps_authorisation")?.signature ?? null}
        authoriserSignedAt={signedRequestFor("dps_authorisation")?.signed_at ?? null}
        auditLine={auditLineFor(signedRequestFor("dps_authorisation"))}
      />

      {/* Conditions */}
      <div className="rounded-xl border border-border bg-card">
        <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Licence conditions ({conditions.length})
          </p>
          <Button size="sm" variant="ghost" onClick={() => { setCondition({}); setConditionOpen(true); }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </div>
        {conditions.length === 0 ? (
          <p className="px-4 py-4 text-xs text-muted-foreground">
            No conditions recorded for {branch}. Add them from this site's own premises licence — conditions are
            never copied from another site.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {(conditions as any[]).map((c) => (
              <div key={c.id} className="px-4 py-3 space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">
                    {c.condition_number ? `Condition ${c.condition_number}` : "Condition"}
                    {c.requirement_category ? ` · ${c.requirement_category}` : ""}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setCondition({ ...c }); setConditionOpen(true); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {c.staff_instruction && <p className="text-xs">{c.staff_instruction}</p>}
                <p className="text-xs text-muted-foreground">{c.legal_wording}</p>
                <p className="text-[11px] text-muted-foreground">
                  {[c.responsible_job_title, c.responsible_person, c.frequency]
                    .filter(Boolean).join(" · ") || "No owner recorded"}
                  {c.next_check ? ` · next check ${new Date(c.next_check).toLocaleDateString("en-GB")}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {editOpen && renderEditDialog()}

      {/* Condition dialog */}
      <Dialog open={conditionOpen} onOpenChange={setConditionOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{condition.id ? "Edit condition" : `Add a condition for ${branch}`}</DialogTitle>
            <DialogDescription>
              Take the wording from this site's premises licence only.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Condition number</Label>
                <Input
                  value={condition.condition_number ?? ""}
                  onChange={(e) => setCondition((c) => ({ ...c, condition_number: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={condition.requirement_category ?? ""}
                  onValueChange={(v) => setCondition((c) => ({ ...c, requirement_category: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                  <SelectContent>
                    {REQUIREMENT_CATEGORIES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Wording from the licence</Label>
              <Textarea
                rows={4}
                value={condition.legal_wording ?? ""}
                onChange={(e) => setCondition((c) => ({ ...c, legal_wording: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>What staff must do (plain English)</Label>
              <Textarea
                rows={3}
                value={condition.staff_instruction ?? ""}
                onChange={(e) => setCondition((c) => ({ ...c, staff_instruction: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Responsible job title</Label>
                <Input
                  value={condition.responsible_job_title ?? ""}
                  onChange={(e) => setCondition((c) => ({ ...c, responsible_job_title: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Responsible person</Label>
                <Input
                  value={condition.responsible_person ?? ""}
                  onChange={(e) => setCondition((c) => ({ ...c, responsible_person: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>How often</Label>
                <Select
                  value={condition.frequency ?? ""}
                  onValueChange={(v) => setCondition((c) => ({ ...c, frequency: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Evidence required</Label>
                <Input
                  value={condition.evidence_required ?? ""}
                  onChange={(e) => setCondition((c) => ({ ...c, evidence_required: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Last check</Label>
                <Input
                  type="date"
                  value={condition.last_check ?? ""}
                  onChange={(e) => setCondition((c) => ({ ...c, last_check: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Next check</Label>
                <Input
                  type="date"
                  value={condition.next_check ?? ""}
                  onChange={(e) => setCondition((c) => ({ ...c, next_check: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConditionOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCondition} disabled={busy}>{busy ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send for signature */}
      <Dialog open={!!sendOpen} onOpenChange={(o) => !o && setSendOpen(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <FileSignature className="h-4 w-4 inline mr-1.5" />
              Send for signature
            </DialogTitle>
            <DialogDescription>
              {sendOpen ? SUBJECT_LABELS[sendOpen] : ""} for {branch}. They read it first, then sign — no login needed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name of the person signing</Label>
              <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Their email address</Label>
              <Input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </div>

            {sendOpen === "section_57" && (
              <>
                <div className="space-y-1.5">
                  <Label>Where Part A of the licence is kept</Label>
                  <Input value={partA} onChange={(e) => setPartA(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Nominated people</Label>
                  {nominated.map((n, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        placeholder="Name"
                        value={n.name}
                        onChange={(e) => setNominated((list) =>
                          list.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                      />
                      <Input
                        placeholder="Job title"
                        value={n.job_title}
                        onChange={(e) => setNominated((list) =>
                          list.map((x, j) => (j === i ? { ...x, job_title: e.target.value } : x)))}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setNominated((list) => list.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setNominated((list) => [...list, { name: "", job_title: "" }])}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add person
                  </Button>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendOpen(null)}>Cancel</Button>
            <Button onClick={handleSend} disabled={busy}>
              {busy ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Fact({ label, value }: { label: string; value?: string | null }) {
  const isDate = /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ""));
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate">
        {isDate ? new Date(String(value)).toLocaleDateString("en-GB") : fieldOrDash(value)}
      </p>
    </div>
  );
}
