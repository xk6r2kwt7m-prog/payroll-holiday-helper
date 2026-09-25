import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, ExternalLink, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { useUploadDocument } from "@/hooks/useEmployeeDocuments";
import {
  isRightToWorkCleared,
  rightToWorkFollowUp,
  type RtwCheck,
} from "@/lib/right-to-work-status";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const METHOD_LABELS: Record<string, string> = {
  employer_checking_service: "Employer Checking Service (ECS)",
  online_share_code: "Online share code check (gov.uk)",
  manual_document: "Manual check of original document",
  digital_id_provider: "Certified digital ID provider (British or Irish citizens only)",
};

const RESULT_LABELS: Record<string, string> = {
  ecs_pending: "ECS request pending — not yet cleared",
  unlimited: "Unlimited right to work",
  time_limited: "Time-limited permission",
  no_right_to_work: "No right to work",
};

const STATUS_LABELS: Record<string, string> = {
  cleared: "Cleared",
  pending: "Pending",
  rejected: "No right to work",
  missing: "Not cleared",
};

interface CheckRow {
  id: string;
  check_method: string;
  checked_on: string;
  created_at: string;
  result: "unlimited" | "time_limited" | "no_right_to_work" | "ecs_pending";
  permission_expires_on: string | null;
  work_restrictions: string | null;
  checked_by_name: string | null;
  evidence_document_id: string | null;
  notes: string | null;
  is_student: boolean;
  study_dates: string | null;
  student_evidence_document_id: string | null;
}

interface Props {
  employeeId: string;
  employeeName: string;
}

const fmt = (d: string) => format(new Date(`${d}T00:00:00`), "d MMM yyyy");

export function RecordRightToWorkCheck({ employeeId, employeeName }: Props) {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const uploadDocument = useUploadDocument();
  const today = format(new Date(), "yyyy-MM-dd");

  const listKey = ["right_to_work_checks", tenantId, employeeId];
  const { data: checks = [], isLoading, isError, refetch } = useQuery({
    queryKey: listKey,
    enabled: !!tenantId && !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("right_to_work_checks")
        .select(
          "id, check_method, checked_on, created_at, result, permission_expires_on, work_restrictions, checked_by_name, evidence_document_id, notes, is_student, study_dates, student_evidence_document_id"
        )
        .eq("tenant_id", tenantId!)
        .eq("employee_id", employeeId)
        .order("checked_on", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CheckRow[];
    },
  });

  const { data: staffContext } = useQuery({
    queryKey: ["staff_compliance_context", tenantId, employeeId], enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase.from("employee_onboarding_data" as any)
        .select("ni_status:personal_info->>ni_status, ni_application_date:personal_info->>ni_application_date, ecs_reason:personal_info->>ecs_reason, study_provider:personal_info->>study_provider, study_dates:personal_info->>study_dates, work_restrictions:personal_info->>work_restrictions")
        .eq("tenant_id", tenantId!).eq("employee_id", employeeId).maybeSingle();
      if (error) throw error;
      return data as unknown as Record<string, string | null> | null;
    },
  });
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState("");
  const [checkedOn, setCheckedOn] = useState(today);
  const [result, setResult] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [restrictions, setRestrictions] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [student, setStudent] = useState(false);
  const [studyDates, setStudyDates] = useState("");
  const [studentFile, setStudentFile] = useState<File | null>(null);

  const reset = () => {
    setMethod("");
    setCheckedOn(today);
    setResult("");
    setExpiresOn("");
    setRestrictions("");
    setFile(null);
    setNotes("");
    setStudent(false); setStudyDates(""); setStudentFile(null);
  };

  const status = isRightToWorkCleared(null, [], checks as RtwCheck[]);
  const followUp = rightToWorkFollowUp(checks as RtwCheck[]);

  const canSave =
    !!method &&
    !!checkedOn &&
    checkedOn <= today &&
    !!result &&
    (result !== "time_limited" || !!expiresOn) &&
    (result === "ecs_pending" ? method === "employer_checking_service" && !!notes.trim() : !!file) &&
    (!student || !["unlimited", "time_limited"].includes(result) || (!!studentFile && !!studyDates.trim() && !!restrictions.trim())) &&
    (result !== "time_limited" || expiresOn >= checkedOn) &&
    !saving;

  const openEvidence = async (documentId: string) => {
    try {
      const { data: doc, error } = await supabase
        .from("employee_documents")
        .select("file_path")
        .eq("id", documentId)
        .single();
      if (error || !doc) throw error;
      const { data, error: urlError } = await supabase.storage
        .from("employee-documents")
        .createSignedUrl(doc.file_path, 60);
      if (urlError) throw urlError;
      window.open(data.signedUrl, "_blank");
    } catch {
      toast.error("Failed to download document");
    }
  };

  const handleSave = async () => {
    if (!canSave || !tenantId || !user) return;
    setSaving(true);
    let uploaded: { id: string } | null = null;
    let studentDocument: { id: string } | null = null;
    try {
      if (student && studentFile) studentDocument = await uploadDocument.mutateAsync({ employeeId, file: studentFile, documentType: "right_to_work", documentName: "Student course and term dates evidence" });
      if (file) uploaded = (await uploadDocument.mutateAsync({
        employeeId,
        file: file!,
        documentType: "right_to_work",
        documentName: `Right to work check ${checkedOn}`,
      })) as { id: string };
    } catch (e: any) {
      toast.error(`Evidence upload failed: ${e?.message ?? "unknown error"}. The check was not recorded. Any file already uploaded remains in employee documents.`);
      setSaving(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const { error } = await supabase.from("right_to_work_checks").insert({
      tenant_id: tenantId,
      employee_id: employeeId,
      check_method: method,
      checked_on: checkedOn,
      result,
      permission_expires_on: result === "time_limited" ? expiresOn : null,
      work_restrictions: restrictions.trim() || null,
      notes: notes.trim() || null,
      checked_by: user.id,
      checked_by_name: profile?.full_name ?? user.email ?? null,
      evidence_document_id: uploaded?.id ?? null,
      is_student: student,
      study_dates: student ? studyDates.trim() || null : null,
      student_evidence_document_id: studentDocument?.id ?? null,
    });
    setSaving(false);

    if (error) {
      toast.error(
        `The evidence file was saved, but the check was not: ${error.message}`
      );
      return;
    }

    toast.success(`Right to work check recorded for ${employeeName}`);
    queryClient.invalidateQueries({ queryKey: listKey });
    queryClient.invalidateQueries({ queryKey: ["employee_readiness"] });
    queryClient.invalidateQueries({ queryKey: ["team_readiness"] });
    queryClient.invalidateQueries({ queryKey: ["onboarding_rtw_checks"] });
    queryClient.invalidateQueries({ queryKey: ["missing_information"] });
    reset();
    setOpen(false);
  };

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Right to work checks</span>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          Record right to work check
        </Button>
      </div>

      {staffContext?.ni_status === "application_pending" && <p className="text-sm">NI application pending{staffContext.ni_application_date ? ` since ${staffContext.ni_application_date}` : ""}. Follow up with the employee; this is separate from right-to-work clearance.</p>}
      {staffContext?.ecs_reason && <p className="text-sm">Employee needs checking assistance: {staffContext.ecs_reason}</p>}
      {staffContext?.study_provider && <p className="text-sm">Submitted study details (awaiting verification): {staffContext.study_provider}; {staffContext.study_dates}; {staffContext.work_restrictions}</p>}
      {!isError && checks.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant={status === "cleared" ? "default" : "destructive"}>
            {STATUS_LABELS[status] ?? status}
          </Badge>
          {followUp && (
            <span className={cn(followUp.overdue ? "text-destructive font-medium" : "text-muted-foreground")}>
              Follow-up check due {fmt(followUp.dueOn)}
            </span>
          )}
        </div>
      )}

      {isError ? (<div role="alert">Unable to confirm checks. <Button variant="outline" onClick={() => void refetch()}>Retry</Button></div>) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : checks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No right to work check recorded yet</p>
      ) : (
        <ul className="space-y-1.5">
          {checks.map((c) => (
            <li key={c.id} className="text-sm text-foreground">
              <span className="font-medium">{fmt(c.checked_on)}</span>
              {" · "}{METHOD_LABELS[c.check_method] ?? c.check_method}
              {" · "}{RESULT_LABELS[c.result] ?? c.result}
              {c.result === "time_limited" && c.permission_expires_on && (
                <> · expires {fmt(c.permission_expires_on)}</>
              )}
              {c.work_restrictions && <> · {c.work_restrictions}</>}
              {c.is_student && <span> · Student: {c.study_dates}</span>}
              {c.student_evidence_document_id && <button className="text-primary underline" onClick={() => openEvidence(c.student_evidence_document_id!)}> Course evidence</button>}
              {c.checked_by_name && <> · checked by {c.checked_by_name}</>}
              {c.evidence_document_id && (
                <>
                  {" · "}
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
                    onClick={() => openEvidence(c.evidence_document_id!)}
                  >
                    Evidence <ExternalLink className="h-3 w-3" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={(o) => { if (!saving) { setOpen(o); if (!o) reset(); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record right to work check — {employeeName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-sm space-x-3">
              <a className="text-primary underline" href="https://www.gov.uk/view-right-to-work" target="_blank" rel="noreferrer">Check share code on GOV.UK</a>
              <a className="text-primary underline" href="https://www.gov.uk/employee-immigration-employment-status" target="_blank" rel="noreferrer">Employer Checking Service</a>
            </div>
            <p className="text-xs text-muted-foreground">Complete the official check and confirm the result belongs to the employee before recording clearance. An ECS request alone is not clearance.</p>
            <label className="flex gap-2 text-sm"><input type="checkbox" checked={student} onChange={(e) => setStudent(e.target.checked)} />Student with immigration work restrictions</label>
            {student && <div className="space-y-2">
              <Label>Course, term dates and vacation dates</Label>
              <Textarea value={studyDates} onChange={(e) => setStudyDates(e.target.value)} placeholder="Record the education provider, course and confirmed dates for the academic year" />
              <Label>Course and term-date evidence</Label>
              <Input type="file" accept="application/pdf,image/*" onChange={(e) => setStudentFile(e.target.files?.[0] ?? null)} />
              <p className="text-xs text-muted-foreground">Record the actual work restrictions below; no standard hours limit is assumed.</p>
            </div>}
            <div className="space-y-1.5">
              <Label>How it was checked</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(METHOD_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Date checked</Label>
              <Input type="date" value={checkedOn} max={today} onChange={(e) => setCheckedOn(e.target.value)} />
              {checkedOn > today && <p className="text-xs text-destructive">Date cannot be in the future.</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Result</Label>
              <Select value={result} onValueChange={setResult}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(RESULT_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {result === "no_right_to_work" && (
              <div className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                Do not let this person work. Get advice before taking any action.
              </div>
            )}

            {result === "time_limited" && (
              <div className="space-y-1.5">
                <Label>Permission expires on</Label>
                <Input type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Work restrictions (optional)</Label>
              <Input value={restrictions} onChange={(e) => setRestrictions(e.target.value)} />
              <p className="text-xs text-muted-foreground">For example: 20 hours a week in term time</p>
            </div>

            <div className="space-y-1.5">
              <Label>Evidence file</Label>
              <Input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <p className="text-xs text-muted-foreground">
                The gov.uk result PDF or a scan of the document checked. Keep a copy of the evidence. It is what protects you in an inspection.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={!canSave}>{saving ? "Saving…" : "Save check"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
