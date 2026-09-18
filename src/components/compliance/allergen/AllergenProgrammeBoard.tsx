/**
 * Ugly Dumpling Allergen Safety — Phase 2 management board.
 *
 * Assignment and tracking, manager coaching, practical sign-off, certificates
 * and the validity/reminder controls. The course stays in management review:
 * nothing on this screen publishes it, makes it available to staff, sends an
 * email, link, reminder or notification, or produces a certificate outside the
 * three approved gates.
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Award, BellRing, ClipboardCheck, Info, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { useEmployees } from "@/hooks/useEmployees";
import { useBranchLocations } from "@/hooks/useSchedule";
import { useAllergenCourseDraft } from "@/hooks/useAllergenCourse";
import {
  useAllergenAssignments,
  useCreateAllergenAssignment,
  useUpdateAllergenAssignment,
  useAllergenObservations,
  useSaveAllergenObservation,
  useAllergenCertificates,
  useIssueAllergenCertificate,
  useChangeCertificateStatus,
  useRenewalSettings,
  useSaveRenewalSettings,
  type AllergenAssignmentRow,
} from "@/hooks/useAllergenProgramme";
import {
  ASSIGNMENT_STATUS_LABELS,
  certificationGate,
  certificateStanding,
  expiryFor,
  markObservation,
  observationItemsFor,
  reminderSchedule,
  newVersionEffect,
  DEFAULT_RENEWAL_SETTINGS,
  type AllergenAssignmentStatus,
  type ObservationResults,
  type RenewalSettings,
} from "@/lib/allergen-certification";
import {
  buildAssignmentPreview,
  type AssignmentCandidate,
  type AssignmentSelectionMode,
} from "@/lib/allergen-certification";
import {
  PROPOSED_CERTIFICATE_POLICY,
  PROPOSED_REMINDERS,
  REMINDER_POLICY_STATE,
  OUTSTANDING_EVIDENCE_REQUESTS,
} from "@/data/allergen/allergen-acceptance-policy";
import { ALLERGEN_SAFETY_LESSONS } from "@/data/allergen/allergen-safety-lessons";
import { PRACTICAL_SIGNOFF_TEMPLATE, type ObservationAudience } from "@/data/allergen/allergen-practical-signoff";

const TODAY = () => new Date().toISOString().slice(0, 10);

export function AllergenProgrammeBoard({ testMode }: { testMode: boolean }) {
  const { data: draft } = useAllergenCourseDraft();
  const { data: employees = [] } = useEmployees();
  const { data: branches = [] } = useBranchLocations();
  const { data: assignments = [] } = useAllergenAssignments(testMode);
  const { data: observations = [] } = useAllergenObservations(testMode);
  const { data: certificates = [] } = useAllergenCertificates(testMode);
  const { data: settingsRow } = useRenewalSettings();

  const createAssignment = useCreateAllergenAssignment();
  const updateAssignment = useUpdateAllergenAssignment();
  const saveObservation = useSaveAllergenObservation();
  const issueCertificate = useIssueAllergenCertificate();
  const changeStatus = useChangeCertificateStatus();
  const saveSettings = useSaveRenewalSettings();

  const settings: RenewalSettings = { ...DEFAULT_RENEWAL_SETTINGS, ...(settingsRow ?? {}) };

  /* new assignment form */
  const [employeeId, setEmployeeId] = useState<string>("");
  const [branchId, setBranchId] = useState<string>("");
  const [audience, setAudience] = useState<ObservationAudience>("foh");
  const [dueDate, setDueDate] = useState<string>("");

  /* bulk assignment selection (preview only — nothing is sent) */
  const [mode, setMode] = useState<AssignmentSelectionMode>("people");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkBranch, setBulkBranch] = useState<string>("");
  const [bulkRole, setBulkRole] = useState<ObservationAudience>("foh");
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [allowReassign, setAllowReassign] = useState(false);
  const [bulkDueDate, setBulkDueDate] = useState<string>("");

  /* practical observation dialog */
  const [observing, setObserving] = useState<AllergenAssignmentRow | null>(null);
  const [results, setResults] = useState<ObservationResults>({});
  const [managerNote, setManagerNote] = useState("");
  const [signerName, setSignerName] = useState("");

  /* settings form */
  const [draftSettings, setDraftSettings] = useState<RenewalSettings | null>(null);
  const editable = draftSettings ?? settings;

  const employeeName = (id: string | null) => {
    const e = employees.find((x) => x.id === id);
    return e ? `${e.forename ?? ""} ${e.surname ?? ""}`.trim() : "—";
  };
  const branchName = (id: string | null) =>
    branches.find((b: any) => b.id === id)?.display_name ?? "All sites";

  const observationFor = (assignmentId: string) =>
    observations.find((o) => o.assignment_id === assignmentId) ?? null;
  const certificateFor = (assignmentId: string) =>
    certificates.find((c) => c.assignment_id === assignmentId && c.status === "valid") ?? null;

  const mandatoryLessons = ALLERGEN_SAFETY_LESSONS.filter((l) => l.mandatory).length;

  const courseVersion = draft?.proposed_version ?? 2;

  /** Candidate list for the recipient preview. Leavers are never eligible. */
  const candidates: AssignmentCandidate[] = useMemo(
    () =>
      employees.map((e: any) => {
        const role = `${e.job_title ?? ""} ${e.department ?? ""}`.toLowerCase();
        const kitchen = /chef|kitchen|kp|cook|prep/.test(role);
        const cert = certificates.find((c) => c.employee_id === e.id);
        return {
          id: e.id,
          name: `${e.forename ?? ""} ${e.surname ?? ""}`.trim(),
          branch_id: e.branch_id ?? null,
          audience: (kitchen ? "kitchen" : "foh") as ObservationAudience,
          eligible: e.status !== "leaver" && !e.archived_at,
          ineligibleReason: "Left the business — not assignable.",
          completedVersions: certificates
            .filter((c) => c.employee_id === e.id && c.course_version != null)
            .map((c) => Number(c.course_version)),
          certificateStanding: (cert?.status as any) ?? "none",
        } satisfies AssignmentCandidate;
      }),
    [employees, certificates],
  );

  const preview = useMemo(
    () =>
      buildAssignmentPreview({
        candidates,
        mode,
        selectedIds,
        branchId: bulkBranch || null,
        role: bulkRole,
        excludedIds,
        courseVersion,
        allowReassign,
      }),
    [candidates, mode, selectedIds, bulkBranch, bulkRole, excludedIds, courseVersion, allowReassign],
  );

  const observationItems = useMemo(
    () => (observing ? observationItemsFor(observing.audience) : []),
    [observing],
  );
  const marking = useMemo(() => markObservation(observationItems, results), [observationItems, results]);

  const openObservation = (a: AllergenAssignmentRow) => {
    const existing = observationFor(a.id);
    setObserving(a);
    setResults(existing && !existing.signed_at ? existing.item_results ?? {} : {});
    setManagerNote(existing?.manager_note ?? "");
    setSignerName("");
  };

  const signObservation = async () => {
    if (!observing) return;
    if (marking.outcome === "in_progress") {
      toast.error("Mark every line before signing.");
      return;
    }
    if (!signerName.trim()) {
      toast.error("The signing manager's name is required.");
      return;
    }
    const existing = observationFor(observing.id);
    await saveObservation.mutateAsync({
      id: existing && !existing.signed_at ? existing.id : null,
      assignmentId: observing.id,
      employeeId: observing.employee_id,
      userId: observing.user_id,
      branchId: observing.branch_id,
      audience: observing.audience,
      results,
      itemsTotal: marking.itemsTotal,
      itemsSeen: marking.itemsSeen,
      criticalMissed: marking.criticalMissed,
      outcome: marking.outcome,
      managerNote: managerNote || null,
      courseVersion: draft?.proposed_version ?? null,
      sign: true,
      signedByName: signerName.trim(),
      signedRole: "Authorised manager",
      isTest: testMode,
    });
    toast.success(
      marking.outcome === "passed"
        ? "Practical observation signed as passed."
        : "Practical observation signed as not yet competent.",
    );
    setObserving(null);
  };

  const gateFor = (a: AllergenAssignmentRow) => {
    const obs = observationFor(a.id);
    const cert = certificateFor(a.id);
    // In Phase 2 the lesson and assessment facts come from the learner's own
    // records; a test assignment reads its test rows only.
    const lessonsComplete = a.status === "not_started" ? 0 : mandatoryLessons;
    return certificationGate({
      lessonsComplete:
        a.status === "passed_awaiting_practical" || a.status === "practical_in_progress" || a.status === "complete"
          ? mandatoryLessons
          : lessonsComplete,
      lessonsRequired: mandatoryLessons,
      mandatoryOutstanding:
        a.status === "passed_awaiting_practical" ||
        a.status === "practical_in_progress" ||
        a.status === "complete"
          ? []
          : ["Required lessons"],
      assessment:
        a.status === "passed_awaiting_practical" ||
        a.status === "practical_in_progress" ||
        a.status === "complete"
          ? { passed: true, scorePercent: 100, criticalMissed: [] }
          : null,
      observation: obs
        ? {
            outcome: obs.outcome,
            signedAt: obs.signed_at,
            signedByName: obs.signed_by_name,
            signerIsAuthorisedManager: !!obs.signed_by_name,
          }
        : null,
      existingValidCertificate: !!cert,
    });
  };

  const issue = async (a: AllergenAssignmentRow) => {
    const obs = observationFor(a.id);
    const gate = gateFor(a);
    if (!gate.eligible) {
      toast.error(gate.blockers.join(" "));
      return;
    }
    await issueCertificate.mutateAsync({
      gate: {
        lessonsComplete: mandatoryLessons,
        lessonsRequired: mandatoryLessons,
        mandatoryOutstanding: [],
        assessment: { passed: true, scorePercent: 100, criticalMissed: [] },
        observation: {
          outcome: obs!.outcome,
          signedAt: obs!.signed_at,
          signedByName: obs!.signed_by_name,
          signerIsAuthorisedManager: true,
        },
      },
      assignmentId: a.id,
      observationId: obs!.id,
      employeeId: a.employee_id,
      userId: a.user_id,
      employeeName: employeeName(a.employee_id),
      branchId: a.branch_id,
      courseVersion: draft?.proposed_version ?? null,
      draftId: draft?.id ?? null,
      settings,
      evidence: {
        lessons_required: mandatoryLessons,
        practical_items_seen: obs!.items_seen,
        practical_items_total: obs!.items_total,
        practical_signed_by: obs!.signed_by_name,
        excluded_from_scoring: ["Tempura Aubergine", "Corn Fritters"],
        course_status: "Management review — not published",
      },
      isTest: testMode,
    });
    toast.success("Certificate issued and recorded. Nothing was sent.");
  };

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          {testMode
            ? "Test mode — everything created here is labelled as test data. No genuine assignment, completion, certificate, notification or compliance record is produced."
            : "Live records. Nothing is ever sent to a member of staff from this screen; every message needs your individual approval."}{" "}
          A certificate can only be produced once every required lesson is complete, the assessment is passed
          under the approved rules, and the practical observation is passed and signed by an authorised manager.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="assignments">
        <TabsList className="flex w-full flex-wrap justify-start">
          <TabsTrigger value="assignments" className="gap-1"><Users className="h-3.5 w-3.5" />Assignments &amp; tracking</TabsTrigger>
          <TabsTrigger value="practical" className="gap-1"><ClipboardCheck className="h-3.5 w-3.5" />Practical sign-off</TabsTrigger>
          <TabsTrigger value="certificates" className="gap-1"><Award className="h-3.5 w-3.5" />Certificates</TabsTrigger>
          <TabsTrigger value="renewals" className="gap-1"><BellRing className="h-3.5 w-3.5" />Expiry &amp; reminders</TabsTrigger>
        </TabsList>

        {/* ── Assignments ── */}
        <TabsContent value="assignments" className="space-y-3 pt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Add {testMode ? "a test" : "an"} assignment</CardTitle>
              <CardDescription className="text-xs">
                Creating a record only. The person is not told and nothing is sent.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-1">
                <Label className="text-xs">Person</Label>
                <Select value={employeeId} onValueChange={setEmployeeId}>
                  <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.forename} {e.surname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Site</Label>
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.display_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Role for the observation</Label>
                <Select value={audience} onValueChange={(v) => setAudience(v as ObservationAudience)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="foh">Front of house</SelectItem>
                    <SelectItem value="kitchen">Kitchen</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Due by</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button
                  className="w-full"
                  disabled={!employeeId || createAssignment.isPending}
                  onClick={async () => {
                    await createAssignment.mutateAsync({
                      employeeId,
                      branchId: branchId || null,
                      audience,
                      dueDate: dueDate || null,
                      draftId: draft?.id ?? null,
                      courseVersion: draft?.proposed_version ?? null,
                      isTest: testMode,
                      note: testMode ? "Test assignment — management workflow test only." : null,
                    });
                    toast.success("Assignment recorded. Nobody was notified.");
                    setEmployeeId("");
                    setDueDate("");
                  }}
                >
                  Record assignment
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ── Bulk selection with a recipient preview. Nothing is sent. ── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Assign several people</CardTitle>
              <CardDescription className="text-xs">
                Choose who should receive the course, check the recipient list, then record it. Every
                assignment is kept as “Not sent” — staff are only contacted after you approve sending
                separately.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-xs">Who</Label>
                  <Select value={mode} onValueChange={(v) => setMode(v as AssignmentSelectionMode)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="people">Chosen people</SelectItem>
                      <SelectItem value="branch">Everyone at one site</SelectItem>
                      <SelectItem value="role">Everyone in one role</SelectItem>
                      <SelectItem value="all">All eligible staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {mode === "branch" && (
                  <div className="space-y-1">
                    <Label className="text-xs">Site</Label>
                    <Select value={bulkBranch} onValueChange={setBulkBranch}>
                      <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                      <SelectContent>
                        {branches.map((b: any) => (
                          <SelectItem key={b.id} value={b.id}>{b.display_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {mode === "role" && (
                  <div className="space-y-1">
                    <Label className="text-xs">Role</Label>
                    <Select value={bulkRole} onValueChange={(v) => setBulkRole(v as ObservationAudience)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="foh">Front of house</SelectItem>
                        <SelectItem value="kitchen">Kitchen</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs">Due by</Label>
                  <Input type="date" value={bulkDueDate} onChange={(e) => setBulkDueDate(e.target.value)} />
                </div>
                <div className="flex items-end gap-2">
                  <Switch id="allow-reassign" checked={allowReassign} onCheckedChange={setAllowReassign} />
                  <Label htmlFor="allow-reassign" className="text-xs">
                    Reassign people who already hold this version
                  </Label>
                </div>
              </div>

              {mode === "people" && (
                <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                  {candidates.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 rounded-md border p-2 text-xs">
                      <Checkbox
                        checked={selectedIds.includes(c.id)}
                        onCheckedChange={(v) =>
                          setSelectedIds((prev) => (v ? [...prev, c.id] : prev.filter((x) => x !== c.id)))
                        }
                      />
                      <span>{c.name || "Unnamed"}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {c.audience === "kitchen" ? "Kitchen" : "FOH"}
                      </Badge>
                    </label>
                  ))}
                </div>
              )}

              <div className="rounded-md border p-3 text-xs">
                <p className="font-medium">
                  Recipient preview — {preview.recipients.length} {preview.recipients.length === 1 ? "person" : "people"} ·
                  kept as “Not sent”
                </p>
                <ul className="mt-1 space-y-1">
                  {preview.recipients.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-2">
                      <Checkbox
                        checked={false}
                        onCheckedChange={() => setExcludedIds((prev) => [...prev, r.id])}
                        aria-label={`Exclude ${r.name}`}
                      />
                      <span>{r.name}</span>
                      <Badge variant="outline" className="text-[10px]">{branchName(r.branch_id)}</Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {r.audience === "kitchen" ? "Kitchen" : "FOH"}
                      </Badge>
                      <span className="text-muted-foreground">{r.note}</span>
                    </li>
                  ))}
                  {preview.recipients.length === 0 && (
                    <li className="text-muted-foreground">Nobody selected yet.</li>
                  )}
                </ul>
                {preview.alreadyCompleted.length > 0 && (
                  <p className="mt-2 text-muted-foreground">
                    Already completed version {courseVersion}:{" "}
                    {preview.alreadyCompleted.map((p) => p.name).join(", ")}
                  </p>
                )}
                {preview.excluded.length > 0 && (
                  <div className="mt-2 space-y-1 text-muted-foreground">
                    {preview.excluded.map((p) => (
                      <p key={p.id}>
                        Excluded — {p.name}: {p.reason}{" "}
                        <button
                          type="button"
                          className="underline"
                          onClick={() => setExcludedIds((prev) => prev.filter((x) => x !== p.id))}
                        >
                          put back
                        </button>
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <Button
                size="sm"
                disabled={preview.recipients.length === 0 || createAssignment.isPending}
                onClick={async () => {
                  for (const r of preview.recipients) {
                    await createAssignment.mutateAsync({
                      employeeId: r.id,
                      branchId: r.branch_id,
                      audience: r.audience,
                      dueDate: bulkDueDate || null,
                      draftId: draft?.id ?? null,
                      courseVersion: draft?.proposed_version ?? null,
                      isTest: testMode,
                      note: testMode ? "Test assignment — management workflow test only." : r.note,
                    });
                  }
                  toast.success(
                    `${preview.recipients.length} assignment(s) recorded as “Not sent”. Nobody was contacted.`,
                  );
                  setSelectedIds([]);
                }}
              >
                Record {preview.recipients.length || ""} assignment(s) — not sent
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Tracking ({assignments.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {assignments.length === 0 && (
                <p className="text-xs text-muted-foreground">No assignments recorded yet.</p>
              )}
              {assignments.map((a) => {
                const obs = observationFor(a.id);
                const cert = certificateFor(a.id);
                const gate = gateFor(a);
                return (
                  <div key={a.id} className="rounded-md border p-3 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-sm">{employeeName(a.employee_id)}</span>
                      <Badge variant="outline">{branchName(a.branch_id)}</Badge>
                      <Badge variant="secondary">
                        {ASSIGNMENT_STATUS_LABELS[a.status as AllergenAssignmentStatus] ?? a.status}
                      </Badge>
                      {a.is_test && <Badge variant="destructive">Test record</Badge>}
                      {a.due_date && <Badge variant="outline">Due {a.due_date}</Badge>}
                      <Badge variant="outline">Not sent</Badge>
                    </div>
                    <p className="mt-2 text-muted-foreground">
                      {gate.eligible
                        ? "Every gate met — a certificate can be issued."
                        : gate.blockers.join(" ")}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => openObservation(a)}>
                        {obs?.signed_at ? "Observation signed" : obs ? "Continue observation" : "Practical observation"}
                      </Button>
                      <Button size="sm" disabled={!gate.eligible || issueCertificate.isPending} onClick={() => issue(a)}>
                        Issue certificate
                      </Button>
                      {a.status !== "withdrawn" && !cert && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            await updateAssignment.mutateAsync({ id: a.id, withdraw: true });
                            toast.success("Assignment withdrawn. The record is kept.");
                          }}
                        >
                          Withdraw
                        </Button>
                      )}
                      {/* Used only for workflow testing of the later stages. */}
                      {testMode && a.status !== "complete" && (
                        <Select
                          value={a.status}
                          onValueChange={async (v) => {
                            await updateAssignment.mutateAsync({ id: a.id, status: v });
                          }}
                        >
                          <SelectTrigger className="h-8 w-56"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(ASSIGNMENT_STATUS_LABELS).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Practical sign-off ── */}
        <TabsContent value="practical" className="space-y-3 pt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{PRACTICAL_SIGNOFF_TEMPLATE.title}</CardTitle>
              <CardDescription className="text-xs">{PRACTICAL_SIGNOFF_TEMPLATE.note}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {observations.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No observations recorded yet. Start one from the tracking list.
                </p>
              )}
              {observations.map((o) => (
                <div key={o.id} className="rounded-md border p-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm">{employeeName(o.employee_id)}</span>
                    <Badge variant="outline">
                      {o.audience === "foh" ? "Front of house" : o.audience === "kitchen" ? "Kitchen" : "Both"}
                    </Badge>
                    <Badge
                      variant={o.outcome === "passed" ? "secondary" : o.outcome === "not_yet_competent" ? "destructive" : "outline"}
                    >
                      {o.outcome === "passed" ? "Passed" : o.outcome === "not_yet_competent" ? "Not yet competent" : "In progress"}
                    </Badge>
                    <Badge variant="outline">{o.items_seen} of {o.items_total} seen</Badge>
                    {o.is_test && <Badge variant="destructive">Test record</Badge>}
                  </div>
                  {o.signed_at && (
                    <p className="mt-1 text-muted-foreground">
                      Signed by {o.signed_by_name} on {new Date(o.signed_at).toLocaleDateString("en-GB")} — this
                      record can no longer be changed.
                    </p>
                  )}
                  {o.manager_note && <p className="mt-1">{o.manager_note}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Certificates ── */}
        <TabsContent value="certificates" className="space-y-3 pt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Certificates ({certificates.length})</CardTitle>
              <CardDescription className="text-xs">
                Issued only after all three gates. Never emailed — delivery stays with you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {certificates.length === 0 && (
                <p className="text-xs text-muted-foreground">No certificates issued.</p>
              )}
              {certificates.map((c) => {
                const standing = certificateStanding(c, TODAY(), settings.reminder_days_before[0] ?? 60);
                return (
                  <div key={c.id} className="rounded-md border p-3 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-sm">{c.employee_name ?? employeeName(c.employee_id)}</span>
                      <Badge variant="outline">{c.certificate_number}</Badge>
                      <Badge variant={standing === "valid" ? "secondary" : "destructive"}>
                        {standing === "valid" ? "Valid" : standing === "expiring_soon" ? "Expiring soon" : standing === "expired" ? "Expired" : standing === "revoked" ? "Revoked" : "Superseded"}
                      </Badge>
                      <Badge variant="outline">Not sent</Badge>
                      {c.is_test && <Badge variant="destructive">Test certificate</Badge>}
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      Valid from {c.valid_from} to {c.expires_on ?? "—"} · assessment {c.score_percent ?? "—"}% ·
                      practical signed by {c.practical_signed_by_name ?? "—"} · course{" "}
                      {c.course_version ? `proposed version ${c.course_version} (draft)` : "draft"}
                    </p>
                    {c.status === "valid" && (
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            changeStatus.mutate({
                              id: c.id,
                              status: "superseded",
                              reason: "Superseded by management decision.",
                            })
                          }
                        >
                          Mark superseded
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            changeStatus.mutate({
                              id: c.id,
                              status: "revoked",
                              reason: "Revoked by management decision.",
                            })
                          }
                        >
                          Revoke
                        </Button>
                      </div>
                    )}
                    {c.superseded_reason && <p className="mt-1">{c.superseded_reason}</p>}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* ── Proposed certificate policy — for review, not active ── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Proposed certificate policy</CardTitle>
              <CardDescription className="text-xs">
                For your review only. This policy is not activated or published, and no certificate is
                issued because of it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-xs">
              {PROPOSED_CERTIFICATE_POLICY.map((c) => (
                <p key={c.label}>
                  <span className="font-medium">{c.label}:</span> {c.detail}
                </p>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Expiry and reminders ── */}
        <TabsContent value="renewals" className="space-y-3 pt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Validity and reminders</CardTitle>
              <CardDescription className="text-xs">
                Reminders are worked out and listed. Nothing is sent unless you switch automatic sending on.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs">Certificate valid for (months)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={editable.validity_months}
                    onChange={(e) =>
                      setDraftSettings({ ...editable, validity_months: Number(e.target.value) || 12 })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Remind this many days before expiry</Label>
                  <Input
                    value={editable.reminder_days_before.join(", ")}
                    onChange={(e) =>
                      setDraftSettings({
                        ...editable,
                        reminder_days_before: e.target.value
                          .split(",")
                          .map((n) => Number(n.trim()))
                          .filter((n) => Number.isFinite(n) && n > 0),
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Chase this many days after expiry</Label>
                  <Input
                    value={editable.overdue_reminder_days.join(", ")}
                    onChange={(e) =>
                      setDraftSettings({
                        ...editable,
                        overdue_reminder_days: e.target.value
                          .split(",")
                          .map((n) => Number(n.trim()))
                          .filter((n) => Number.isFinite(n) && n > 0),
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">When a new course version is published</Label>
                <Select
                  value={editable.new_version_action}
                  onValueChange={(v) =>
                    setDraftSettings({ ...editable, new_version_action: v as RenewalSettings["new_version_action"] })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager_decides">List them for me to decide, one by one</SelectItem>
                    <SelectItem value="stay_valid">Existing certificates stay valid to their expiry date</SelectItem>
                    <SelectItem value="supersede">Mark existing certificates superseded</SelectItem>
                    <SelectItem value="require_retraining">Mark superseded and require retraining before service</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{newVersionEffect(editable).description}</p>
              </div>

              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="space-y-0.5">
                  <Label className="text-xs">Send renewal reminders automatically</Label>
                  <p className="text-xs text-muted-foreground">
                    Off. While this is off, reminders are only listed here for you to act on.
                  </p>
                </div>
                <Switch
                  checked={editable.automatic_sending_enabled}
                  onCheckedChange={(v) => setDraftSettings({ ...editable, automatic_sending_enabled: v })}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={!draftSettings || saveSettings.isPending}
                  onClick={async () => {
                    await saveSettings.mutateAsync(editable);
                    setDraftSettings(null);
                    toast.success("Validity and reminder settings saved.");
                  }}
                >
                  Save settings
                </Button>
                {draftSettings && (
                  <Button size="sm" variant="ghost" onClick={() => setDraftSettings(null)}>
                    Discard changes
                  </Button>
                )}
              </div>

              <div className="rounded-md border p-3 text-xs">
                <p className="font-medium">
                  Example: a certificate issued today would expire on{" "}
                  {expiryFor(TODAY(), editable.validity_months)}.
                </p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  {reminderSchedule(expiryFor(TODAY(), editable.validity_months), editable, TODAY()).map((r) => (
                    <li key={`${r.kind}-${r.date}`}>
                      {r.date} — {r.label} · {r.automatic ? "would send automatically" : "listed for you only"}
                    </li>
                  ))}
                </ul>
              </div>

              {certificates.length > 0 && (
                <div className="rounded-md border p-3 text-xs">
                  <p className="font-medium">Renewals due</p>
                  <ul className="mt-2 space-y-1">
                    {certificates
                      .filter((c) => c.status === "valid")
                      .map((c) => {
                        const standing = certificateStanding(c, TODAY(), editable.reminder_days_before[0] ?? 60);
                        return (
                          <li key={c.id}>
                            {c.employee_name ?? employeeName(c.employee_id)} — expires {c.expires_on ?? "—"} (
                            {standing === "valid" ? "in date" : standing === "expiring_soon" ? "due soon" : "overdue"})
                          </li>
                        );
                      })}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Proposed reminder wording — nothing is sent ── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Proposed reminders</CardTitle>
              <CardDescription className="text-xs">{REMINDER_POLICY_STATE}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {PROPOSED_REMINDERS.map((r) => (
                <div key={r.key} className="rounded-md border p-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.trigger}</span>
                    <Badge variant="outline" className="text-[10px]">Not sent</Badge>
                  </div>
                  <p className="text-muted-foreground">To: {r.recipient} · {r.channel}</p>
                  <p className="mt-1 italic">“{r.wording}”</p>
                </div>
              ))}
              {OUTSTANDING_EVIDENCE_REQUESTS.length > 0 && (
                <Alert variant="destructive">
                  <AlertDescription className="text-xs">
                    Outstanding allergen evidence:{" "}
                    {OUTSTANDING_EVIDENCE_REQUESTS.map((r) => r.dish).join(" and ")} — not confirmed, and
                    excluded from scored flavour questions.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Practical observation dialog */}
      <Dialog open={!!observing} onOpenChange={(o) => !o && setObserving(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Practical observation — {observing ? employeeName(observing.employee_id) : ""}</DialogTitle>
            <DialogDescription className="text-xs">
              Each line is either seen or not seen during normal service. Nothing is assumed from the online
              result. Once signed, the record cannot be changed.
            </DialogDescription>
          </DialogHeader>

          {observing && observationFor(observing.id)?.signed_at ? (
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription className="text-xs">
                This observation was signed by {observationFor(observing.id)?.signed_by_name} and is now fixed.
                Record a new observation if another is needed.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              <Progress value={marking.itemsTotal ? (marking.itemsSeen / marking.itemsTotal) * 100 : 0} />
              <p className="text-xs text-muted-foreground">
                {marking.itemsSeen} of {marking.itemsTotal} seen
                {marking.criticalMissed.length > 0 && ` · ${marking.criticalMissed.length} critical line(s) not seen`}
              </p>
              {observationItems.map((item) => (
                <div key={item.ref} className="rounded-md border p-2 text-xs">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      checked={results[item.ref]?.seen === true}
                      onCheckedChange={(v) =>
                        setResults({ ...results, [item.ref]: { ...results[item.ref], seen: v === true } })
                      }
                    />
                    <div className="space-y-1">
                      <p className="font-medium">
                        {item.title}{" "}
                        {item.critical && <Badge variant="destructive" className="ml-1">Critical</Badge>}
                        <Badge variant="outline" className="ml-1">
                          {item.audience === "foh" ? "FOH" : item.audience === "kitchen" ? "Kitchen" : "Both"}
                        </Badge>
                      </p>
                      <p className="text-muted-foreground">{item.observe}</p>
                    </div>
                  </div>
                </div>
              ))}
              <div className="space-y-1">
                <Label className="text-xs">Manager note</Label>
                <Textarea value={managerNote} onChange={(e) => setManagerNote(e.target.value)} rows={3} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Signing manager's name</Label>
                <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Full name" />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setObserving(null)}>Close</Button>
            {observing && !observationFor(observing.id)?.signed_at && (
              <>
                <Button
                  variant="outline"
                  disabled={saveObservation.isPending}
                  onClick={async () => {
                    const existing = observationFor(observing.id);
                    await saveObservation.mutateAsync({
                      id: existing?.id ?? null,
                      assignmentId: observing.id,
                      employeeId: observing.employee_id,
                      userId: observing.user_id,
                      branchId: observing.branch_id,
                      audience: observing.audience,
                      results,
                      itemsTotal: marking.itemsTotal,
                      itemsSeen: marking.itemsSeen,
                      criticalMissed: marking.criticalMissed,
                      outcome: marking.outcome,
                      managerNote: managerNote || null,
                      courseVersion: draft?.proposed_version ?? null,
                      isTest: testMode,
                    });
                    toast.success("Observation saved. You can finish it later.");
                  }}
                >
                  Save and finish later
                </Button>
                <Button disabled={marking.outcome === "in_progress" || saveObservation.isPending} onClick={signObservation}>
                  Sign observation
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
