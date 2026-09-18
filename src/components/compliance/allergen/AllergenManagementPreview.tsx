/**
 * Management learner preview — the final hands-on acceptance stage.
 *
 * An authorised administrator reads and answers the whole course exactly as a
 * learner would, as any of six people: front of house and kitchen at each of the
 * three sites. Everything written from here is test activity carrying a preview
 * marker, kept apart from genuine training records.
 *
 * Nothing on this screen publishes version 2, makes the course available to
 * staff, creates a genuine assignment, issues a certificate or sends anything.
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertTriangle, Award, CheckCircle2, ClipboardCheck, Eraser, FlaskConical,
  Monitor, Smartphone, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AllergenLessonReader } from "@/components/training/allergen/AllergenLessonReader";
import { AllergenAssessmentRunner } from "@/components/training/allergen/AllergenAssessmentRunner";
import { useAllergenCourseDraft, useAllergenAttempts, useAllergenLessonProgress } from "@/hooks/useAllergenCourse";
import { useAllergenDishes, useAllergenConflicts } from "@/hooks/useAllergenLibrary";
import { useAllergenObservations, useSaveAllergenObservation } from "@/hooks/useAllergenProgramme";
import {
  usePreviewSessionCounts, useResetPreviewSession,
} from "@/hooks/useAllergenAcceptance";
import { useBranchLocations } from "@/hooks/useSchedule";
import {
  PREVIEW_PERSONAS, previewKeyFor, validateBranchFlavourQuestions,
} from "@/lib/allergen-preview";
import {
  courseProgress, selectQuestionBank, EXCLUDED_FROM_SCORING,
} from "@/lib/allergen-course";
import { certificationGate, markObservation, observationItemsFor } from "@/lib/allergen-certification";
import { ALLERGEN_QUESTION_BANK } from "@/data/allergen/allergen-safety-questions";
import {
  ALLERGEN_SAFETY_LESSONS, ALLERGEN_COURSE_TITLE, ALLERGEN_COURSE_TOTAL_MINUTES,
} from "@/data/allergen/allergen-safety-lessons";
import { PRACTICAL_SIGNOFF_TEMPLATE } from "@/data/allergen/allergen-practical-signoff";
import { resolveSiteBranchIds } from "@/data/allergen/ud-july-2026-menus";
import type { ObservationResults } from "@/lib/allergen-certification";

export function AllergenManagementPreview() {
  const { data: draft } = useAllergenCourseDraft();
  const { data: branches = [] } = useBranchLocations();
  const { data: dishes = [] } = useAllergenDishes();
  const { data: conflicts = [] } = useAllergenConflicts();

  const [personaKey, setPersonaKey] = useState(PREVIEW_PERSONAS[0].key);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [dueDate, setDueDate] = useState<string>("");

  const persona = PREVIEW_PERSONAS.find((p) => p.key === personaKey)!;
  const previewKey = previewKeyFor(persona.key);

  const branchList = useMemo(
    () => branches.map((b: any) => ({ id: b.id, name: b.display_name ?? b.branch ?? "" })),
    [branches],
  );
  const resolved = resolveSiteBranchIds([persona.site], branchList);
  const branchId = resolved.ids[0] ?? null;
  const branchName = branchList.find((b) => b.id === branchId)?.name ?? persona.site;

  const { data: progressRows = [] } = useAllergenLessonProgress(true, previewKey);
  const { data: attempts = [] } = useAllergenAttempts(true, previewKey);
  const { data: observations = [] } = useAllergenObservations(true, previewKey);
  const { data: counts } = usePreviewSessionCounts(previewKey);
  const resetPreview = useResetPreviewSession();
  const saveObservation = useSaveAllergenObservation();

  const versionLabel = draft
    ? `Studying proposed version ${draft.proposed_version} (draft — not published)`
    : "No draft snapshot prepared yet";

  const progress = useMemo(
    () =>
      courseProgress(
        ALLERGEN_SAFETY_LESSONS,
        progressRows.map((p) => ({
          lesson_ref: p.lesson_ref,
          completed_sections: p.completed_sections ?? [],
          is_complete: p.is_complete,
        })),
      ),
    [progressRows],
  );

  const eligibility = useMemo(
    () => ({
      dishes: dishes.map((d) => ({
        dish_name: d.dish_name,
        is_confirmed: d.is_confirmed,
        management_decision: d.management_decision,
        active_branch_ids: d.active_branch_ids,
      })),
      conflicts: conflicts.map((c) => ({ subject: c.subject, status: c.status })),
    }),
    [dishes, conflicts],
  );

  const bank = useMemo(
    () =>
      selectQuestionBank({
        bank: ALLERGEN_QUESTION_BANK,
        ...eligibility,
        branchId,
        seed: previewKey,
      }),
    [eligibility, branchId, previewKey],
  );

  const scoredFlavours = Array.from(
    new Set(bank.questions.map((q) => q.flavour).filter(Boolean) as string[]),
  );
  const validation = validateBranchFlavourQuestions(persona.site, scoredFlavours);

  /* ── Practical observation for this preview persona ── */
  const observationItems = observationItemsFor(persona.audience);
  const openObservation = observations.find((o) => !o.signed_at) ?? null;
  const signedObservation = observations.find((o) => !!o.signed_at) ?? null;
  const [results, setResults] = useState<ObservationResults>({});
  const [managerNote, setManagerNote] = useState("");
  const [signerName, setSignerName] = useState("");
  const liveResults: ObservationResults = Object.keys(results).length
    ? results
    : ((openObservation?.item_results as ObservationResults) ?? {});
  const marking = markObservation(observationItems, liveResults);

  const passedAttempt = attempts.find((a) => a.status === "submitted" && a.passed === true) ?? null;
  const lastSubmitted = [...attempts].reverse().find((a) => a.status === "submitted") ?? null;
  const attemptScore = passedAttempt?.score_percent ?? lastSubmitted?.score_percent ?? null;

  const gate = certificationGate({
    lessonsComplete: progress.lessonsComplete,
    lessonsRequired: progress.lessonsTotal,
    mandatoryOutstanding: progress.mandatoryOutstanding,
    assessment: passedAttempt
      ? {
          passed: true,
          scorePercent: Number(passedAttempt.score_percent ?? 0),
          criticalMissed: passedAttempt.critical_missed ?? [],
        }
      : null,
    observation: signedObservation
      ? {
          outcome: signedObservation.outcome,
          signedAt: signedObservation.signed_at,
          signedByName: signedObservation.signed_by_name,
          signerIsAuthorisedManager: true,
        }
      : null,
  });

  const saveObs = (sign: boolean) => {
    if (signedObservation) {
      toast.error("This observation is signed and cannot be changed. Start a fresh observation instead.");
      return;
    }
    saveObservation.mutate(
      {
        id: openObservation?.id ?? null,
        audience: persona.audience,
        branchId,
        results: liveResults,
        itemsTotal: marking.itemsTotal,
        itemsSeen: marking.itemsSeen,
        criticalMissed: marking.criticalMissed,
        outcome: marking.outcome,
        managerNote: managerNote || null,
        sign,
        signedByName: signerName || null,
        signedRole: "Manager (preview)",
        isTest: true,
        previewKey,
      },
      {
        onSuccess: () =>
          toast.success(
            sign
              ? marking.outcome === "passed"
                ? "Preview observation signed as passed."
                : "Preview observation signed as not yet competent."
              : "Preview observation saved — you can finish it later.",
          ),
        onError: (e: any) => toast.error(e.message ?? "Could not save the preview observation"),
      },
    );
  };

  return (
    <div className="space-y-4">
      {/* ── Preview controls ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            <FlaskConical className="h-4 w-4" />
            Management learner preview
            <Badge variant="destructive">Preview only — nothing counts</Badge>
          </CardTitle>
          <CardDescription>
            Read and answer the whole course as one of six people. Everything you do here is stored as
            test activity under a preview marker, so it never becomes a staff assignment, a completion,
            a certificate, a notification or a compliance record.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {PREVIEW_PERSONAS.map((p) => (
              <button
                key={p.key}
                onClick={() => { setPersonaKey(p.key); setResults({}); }}
                aria-pressed={p.key === persona.key}
                className={`rounded-md border p-3 text-left text-xs transition-colors min-h-11 ${
                  p.key === persona.key ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
              >
                <p className="text-sm font-medium">{p.label}</p>
                <p className="mt-0.5 text-muted-foreground">{p.description}</p>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs">Due date shown to this preview learner</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 w-44"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant={device === "desktop" ? "default" : "outline"}
                onClick={() => setDevice("desktop")} className="gap-1">
                <Monitor className="h-3.5 w-3.5" /> Computer
              </Button>
              <Button size="sm" variant={device === "mobile" ? "default" : "outline"}
                onClick={() => setDevice("mobile")} className="gap-1">
                <Smartphone className="h-3.5 w-3.5" /> Phone
              </Button>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              disabled={resetPreview.isPending}
              onClick={() =>
                resetPreview.mutate(
                  { previewKey, personaLabel: persona.label },
                  {
                    onSuccess: () => { setResults({}); setManagerNote(""); setSignerName("");
                      toast.success(`"${persona.label}" preview cleared. No genuine record was touched.`); },
                    onError: (e: any) => toast.error(e.message ?? "Could not clear the preview"),
                  },
                )
              }
            >
              <Eraser className="h-3.5 w-3.5" /> Reset this preview
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">{versionLabel}</Badge>
            <Badge variant="outline">Site: {branchName}</Badge>
            <Badge variant="outline">
              {persona.audience === "foh" ? "Front of house" : "Kitchen"}
            </Badge>
            <Badge variant="outline">About {ALLERGEN_COURSE_TOTAL_MINUTES} min</Badge>
            <Badge variant="outline">Preview marker: {previewKey}</Badge>
          </div>

          {resolved.unmatched.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                No site record matches {resolved.unmatched.join(", ")}, so menu-specific questions cannot
                be chosen for this preview. Nothing has been guessed.
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <FlaskConical className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Reset removes only rows that are marked as test activity <em>and</em> carry this preview
              marker. The database allows nothing else to be deleted by this route. Currently held for
              this preview: {counts?.lessonProgress ?? 0} lesson rows, {counts?.attempts ?? 0} attempts,{" "}
              {counts?.coaching ?? 0} coaching records, {counts?.observations ?? 0} observations.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Tabs defaultValue="branch">
        <TabsList className="flex w-full flex-wrap justify-start">
          <TabsTrigger value="branch">Branch questions</TabsTrigger>
          <TabsTrigger value="lessons">Lessons</TabsTrigger>
          <TabsTrigger value="assessment">Assessment</TabsTrigger>
          <TabsTrigger value="practical">Practical sign-off</TabsTrigger>
          <TabsTrigger value="certificate">Certificate preview</TabsTrigger>
        </TabsList>

        {/* ── Branch question validation, shown before the assessment ── */}
        <TabsContent value="branch" className="space-y-3 pt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                Flavour questions selected for {persona.site}
              </CardTitle>
              <CardDescription className="text-xs">
                Checked against the approved July 2026 menu records before the assessment begins.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{bank.questions.length} questions in this bank</Badge>
                <Badge variant="outline">
                  {bank.questions.filter((q) => q.critical).length} critical safety
                </Badge>
                <Badge variant="outline">{scoredFlavours.length} scored flavours</Badge>
                <Badge variant={validation.ok ? "secondary" : "destructive"}>
                  {validation.ok ? "Matches the approved menu records" : "Does not match — do not proceed"}
                </Badge>
              </div>
              <div className="space-y-1">
                {validation.findings.map((f) => (
                  <p key={`${f.flavour}-${f.expectation}`} className="flex items-center gap-1.5">
                    {f.ok
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                      : <XCircle className="h-3.5 w-3.5 text-destructive" />}
                    <span className="font-medium">{f.flavour}</span>
                    <span className="text-muted-foreground">
                      {f.expectation === "may_include"
                        ? f.present
                          ? "— allowed here, and included."
                          : "— allowed here, but its flavour record is not currently eligible for scoring."
                        : f.present
                          ? "— MUST NOT appear at this site, but it did."
                          : "— correctly absent at this site."}
                    </span>
                  </p>
                ))}
              </div>
              <div className="rounded-md border p-2">
                <p className="font-medium">Scored flavours for this preview</p>
                <p className="text-muted-foreground">
                  {validation.scoredFlavours.length ? validation.scoredFlavours.join(", ") : "None."}
                </p>
              </div>
              <div className="rounded-md border p-2">
                <p className="font-medium">Deliberately never scored</p>
                {EXCLUDED_FROM_SCORING.map((e) => (
                  <p key={e.flavour} className="text-muted-foreground">
                    <span className="font-medium text-foreground">{e.flavour}</span> — {e.reason}
                  </p>
                ))}
              </div>
              {bank.excluded.length > 0 && (
                <div className="rounded-md border p-2">
                  <p className="font-medium">Left out of this site's bank</p>
                  {bank.excluded.map((e) => (
                    <p key={e.id} className="text-muted-foreground">
                      <span className="font-medium text-foreground">{e.flavour ?? e.id}</span> — {e.reason}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Lessons ── */}
        <TabsContent value="lessons" className="pt-3">
          <div className={device === "mobile" ? "mx-auto w-full max-w-[390px] rounded-xl border p-2" : ""}>
            <AllergenLessonReader
              isTest
              previewKey={previewKey}
              personaLabel={persona.label}
              dueDate={dueDate || null}
              courseVersionLabel={versionLabel}
              draftId={draft?.id ?? null}
            />
          </div>
        </TabsContent>

        {/* ── Assessment ── */}
        <TabsContent value="assessment" className="pt-3">
          <div className={device === "mobile" ? "mx-auto w-full max-w-[390px] rounded-xl border p-2" : ""}>
            <AllergenAssessmentRunner
              isTest
              previewKey={previewKey}
              branchId={branchId}
              branchName={branchName}
              courseVersionLabel={versionLabel}
              draftId={draft?.id ?? null}
            />
          </div>
        </TabsContent>

        {/* ── Practical sign-off ── */}
        <TabsContent value="practical" className="space-y-3 pt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <ClipboardCheck className="h-4 w-4" />
                {PRACTICAL_SIGNOFF_TEMPLATE.title} — {persona.audience === "foh" ? "front of house" : "kitchen"}
              </CardTitle>
              <CardDescription className="text-xs">
                {observationItems.length} lines for this role. Every line must be seen for a pass; a
                critical line marked as not seen signs as “Not yet competent”. A signed record can never
                be changed — a fresh observation is recorded instead.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">{marking.itemsSeen} of {marking.itemsTotal} seen</Badge>
                <Badge variant={marking.outcome === "passed" ? "secondary" : "outline"}>
                  {marking.outcome === "passed"
                    ? "Would pass"
                    : marking.outcome === "not_yet_competent"
                      ? "Would sign as not yet competent"
                      : "Not finished"}
                </Badge>
                {signedObservation && (
                  <Badge variant="destructive">
                    Signed {signedObservation.signed_at?.slice(0, 10)} — locked
                  </Badge>
                )}
              </div>

              {observationItems.map((item) => {
                const seen = liveResults[item.ref]?.seen;
                return (
                  <div key={item.ref} className="rounded-md border p-2 text-xs">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-medium">{item.title}</p>
                      {item.critical && <Badge variant="destructive" className="text-[10px]">Critical</Badge>}
                    </div>
                    <p className="mt-1 text-muted-foreground">{item.observe}</p>
                    <div className="mt-2 flex gap-4">
                      <label className="flex items-center gap-2">
                        <Checkbox
                          checked={seen === true}
                          disabled={!!signedObservation}
                          onCheckedChange={() =>
                            setResults({ ...liveResults, [item.ref]: { seen: true } })
                          }
                        />
                        <span>Seen and correct</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <Checkbox
                          checked={seen === false}
                          disabled={!!signedObservation}
                          onCheckedChange={() =>
                            setResults({ ...liveResults, [item.ref]: { seen: false } })
                          }
                        />
                        <span>Not seen / not correct</span>
                      </label>
                    </div>
                  </div>
                );
              })}

              <div className="space-y-2">
                <Label className="text-xs">Manager note</Label>
                <Textarea value={managerNote} onChange={(e) => setManagerNote(e.target.value)}
                  disabled={!!signedObservation} rows={2} />
                <Label className="text-xs">Name of the manager signing</Label>
                <Input value={signerName} onChange={(e) => setSignerName(e.target.value)}
                  disabled={!!signedObservation} placeholder="Full name" className="w-full sm:w-72" />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={!!signedObservation || saveObservation.isPending}
                    onClick={() => saveObs(false)}>
                    Save and finish later
                  </Button>
                  <Button
                    size="sm"
                    disabled={
                      !!signedObservation || saveObservation.isPending ||
                      marking.outcome === "in_progress" || !signerName.trim()
                    }
                    onClick={() => saveObs(true)}
                  >
                    Sign this observation
                  </Button>
                </div>
                {marking.outstanding.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Still to mark: {marking.outstanding.slice(0, 3).join(", ")}
                    {marking.outstanding.length > 3 ? ` and ${marking.outstanding.length - 3} more` : ""}.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Certificate preview (never issues) ── */}
        <TabsContent value="certificate" className="space-y-3 pt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Award className="h-4 w-4" />
                Certificate preview
                <Badge variant="destructive" className="text-[10px]">Preview only — not issued</Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Shows what a certificate would say once all three gates are met. This screen cannot
                issue one, in the preview or otherwise.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="space-y-1">
                {[
                  {
                    label: "1. Every required lesson completed",
                    ok: progress.mandatoryOutstanding.length === 0,
                    detail: `${progress.lessonsComplete} of ${progress.lessonsTotal} lessons complete.`,
                  },
                  {
                    label: "2. Assessment passed under the approved rules",
                    ok: !!passedAttempt,
                    detail: attemptScore !== null
                      ? `Best recorded attempt: ${attemptScore}%. 80% and every critical-safety question correct.`
                      : "No submitted attempt in this preview yet.",
                  },
                  {
                    label: "3. Practical observation passed and signed by an authorised manager",
                    ok: signedObservation?.outcome === "passed",
                    detail: signedObservation
                      ? `Signed by ${signedObservation.signed_by_name ?? "—"} on ${signedObservation.signed_at?.slice(0, 10)} as ${signedObservation.outcome === "passed" ? "passed" : "not yet competent"}.`
                      : "No signed observation in this preview yet.",
                  },
                ].map((g) => (
                  <div key={g.label} className="flex items-start gap-2 rounded-md border p-2">
                    {g.ok
                      ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
                    <div>
                      <p className="font-medium">{g.label}</p>
                      <p className="text-muted-foreground">{g.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              {gate.eligible ? (
                <div className="rounded-lg border-2 border-dashed p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Preview — no certificate has been issued
                  </p>
                  <p className="mt-2 text-base font-semibold">{ALLERGEN_COURSE_TITLE}</p>
                  <p className="text-muted-foreground">{persona.label} (management preview learner)</p>
                  <div className="mt-3 grid gap-1 sm:grid-cols-2">
                    <p><span className="text-muted-foreground">Reference: </span>TEST-UD-ALL-…-preview</p>
                    <p><span className="text-muted-foreground">Course version: </span>{draft?.proposed_version ?? "—"} (draft)</p>
                    <p><span className="text-muted-foreground">Assessment score: </span>{attemptScore ?? "—"}%</p>
                    <p><span className="text-muted-foreground">Lessons: </span>{progress.lessonsComplete} of {progress.lessonsTotal}</p>
                    <p><span className="text-muted-foreground">Practical assessor: </span>{signedObservation?.signed_by_name ?? "—"}</p>
                    <p><span className="text-muted-foreground">Validity: </span>12 months (policy approved in principle, not active)</p>
                  </div>
                </div>
              ) : (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <span className="font-medium">{gate.status}.</span> {gate.blockers.join(" ")}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
