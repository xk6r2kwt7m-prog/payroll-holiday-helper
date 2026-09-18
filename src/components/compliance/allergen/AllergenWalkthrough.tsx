/**
 * Ten-minute management acceptance walkthrough for the Allergen Safety course.
 *
 * Thirteen stops that demonstrate the learner interface once, on a phone and on a
 * computer. Everything shown is built from the approved course records and held
 * in this screen only: no genuine course, assessment, progress record,
 * assignment, observation or certificate is created or changed, and nothing is
 * sent to anybody.
 *
 * At the end of each walkthrough management records Pass, Pass with comments or
 * Fail. A comment is required for anything other than a plain pass. When both the
 * phone and the computer walkthrough have passed, version 2 is marked ready to
 * publish for the controlled pilot — publishing and sending remain separate
 * decisions and are untouched here.
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertTriangle, Award, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck,
  Clock, Lock, LogOut, Monitor, RotateCcw, Send, ShieldCheck, Smartphone, Upload, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  ALLERGEN_WALKTHROUGH_STEPS,
  WALKTHROUGH_TOTAL_MINUTES,
  WALKTHROUGH_OUTCOME_LABELS,
  WALKTHROUGH_SCOPE_NOTE,
  walkthroughCommentRequired,
  walkthroughReadiness,
  walkthroughSignoffOutcome,
  type WalkthroughOutcome,
} from "@/data/allergen/allergen-walkthrough";
import {
  ALLERGEN_SAFETY_LESSONS,
  ALLERGEN_COURSE_TITLE,
  ALLERGEN_COURSE_TOTAL_MINUTES,
} from "@/data/allergen/allergen-safety-lessons";
import {
  ALLERGEN_COURSE_MODULES,
  moduleLessons,
  moduleProgressState,
} from "@/data/allergen/allergen-course-modules";
import { ALLERGEN_QUESTION_BANK, CRITICAL_QUESTION_COUNT } from "@/data/allergen/allergen-safety-questions";
import { courseSource } from "@/data/allergen/allergen-course-sources";
import { UD_SITES, resolveSiteBranchIds } from "@/data/allergen/ud-july-2026-menus";
import {
  courseProgress, markAttempt, assessmentGate, selectQuestionBank,
  ALLERGEN_MAX_SCORED_QUESTIONS, ALLERGEN_PASS_MARK, EXCLUDED_FROM_SCORING,
} from "@/lib/allergen-course";
import { certificationGate, markObservation, observationItemsFor, certificateNumber } from "@/lib/allergen-certification";
import { validateBranchFlavourQuestions } from "@/lib/allergen-preview";
import { useAllergenCourseDraft } from "@/hooks/useAllergenCourse";
import { useAllergenDishes, useAllergenConflicts } from "@/hooks/useAllergenLibrary";
import { useBranchLocations } from "@/hooks/useSchedule";
import {
  useAcceptanceChecks, useAcceptanceSignoffs,
  useRecordAcceptanceCheck, useSignAcceptanceEnvironment,
} from "@/hooks/useAllergenAcceptance";

type Device = "mobile" | "desktop";

const DEMO_MODULE = ALLERGEN_COURSE_MODULES[1]; /* Module 2 — peanuts and tree nuts */

export function AllergenWalkthrough() {
  const { data: draft } = useAllergenCourseDraft();
  const { data: dishes = [] } = useAllergenDishes();
  const { data: conflicts = [] } = useAllergenConflicts();
  const { data: branches = [] } = useBranchLocations();
  const { data: checks = [] } = useAcceptanceChecks();
  const { data: signoffs = [] } = useAcceptanceSignoffs();
  const recordCheck = useRecordAcceptanceCheck();
  const sign = useSignAcceptanceEnvironment();

  const [device, setDevice] = useState<Device>("mobile");
  const [site, setSite] = useState<string>(UD_SITES[0]);
  const [stepIndex, setStepIndex] = useState(0);

  /* Demonstration reading progress. Held in this screen only. */
  const [demoProgress, setDemoProgress] = useState<Record<string, string[]>>({});
  const [savedCopy, setSavedCopy] = useState<Record<string, string[]> | null>(null);
  const [awayFromScreen, setAwayFromScreen] = useState(false);

  /* Demonstration answers for the two example questions. */
  const [demoAnswers, setDemoAnswers] = useState<Record<string, string[]>>({});

  /* Outcome recording. */
  const [outcome, setOutcome] = useState<WalkthroughOutcome | null>(null);
  const [comment, setComment] = useState("");
  const [signerName, setSignerName] = useState("");

  const step = ALLERGEN_WALKTHROUGH_STEPS[stepIndex];
  const environment = device === "mobile" ? "smartphone" : "desktop";

  const branchList = useMemo(
    () => branches.map((b: any) => ({ id: b.id, name: b.display_name ?? b.branch ?? "" })),
    [branches],
  );
  const branchId = resolveSiteBranchIds([site], branchList).ids[0] ?? null;

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

  const bank = useMemo(() => {
    try {
      return selectQuestionBank({
        bank: ALLERGEN_QUESTION_BANK,
        ...eligibility,
        branchId,
        seed: `walkthrough:${site}`,
      });
    } catch {
      return null;
    }
  }, [eligibility, branchId, site]);

  const scoredQuestions = bank?.questions ?? [];
  const evidenceWarnings = bank?.criticalWarnings ?? [];
  const singleQuestion = scoredQuestions.find((q) => q.type !== "multi" && q.critical) ?? null;
  const multiQuestion = scoredQuestions.find((q) => q.type === "multi") ?? null;
  const menuQuestion = scoredQuestions.find((q) => !q.critical && !!q.flavour) ?? null;
  const scoredFlavours = Array.from(
    new Set(scoredQuestions.map((q) => q.flavour).filter(Boolean) as string[]),
  );
  const siteValidation = validateBranchFlavourQuestions(site as any, scoredFlavours);

  /* ── Demonstration course progress ── */
  const progress = useMemo(
    () =>
      courseProgress(
        ALLERGEN_SAFETY_LESSONS,
        Object.entries(demoProgress).map(([lesson_ref, completed_sections]) => {
          const lesson = ALLERGEN_SAFETY_LESSONS.find((l) => l.ref === lesson_ref);
          return {
            lesson_ref,
            completed_sections,
            is_complete: !!lesson && completed_sections.length === lesson.sections.length,
          };
        }),
      ),
    [demoProgress],
  );

  const markSection = (lessonRef: string, sectionRef: string) =>
    setDemoProgress((prev) => {
      const done = prev[lessonRef] ?? [];
      if (done.includes(sectionRef)) return prev;
      const next = { ...prev, [lessonRef]: [...done, sectionRef] };
      setSavedCopy(next);
      return next;
    });

  /* ── Demonstration marking, from the approved rules ── */
  const perfect = useMemo(
    () => Object.fromEntries(scoredQuestions.map((q) => [q.id, [...q.correct]])),
    [scoredQuestions],
  );
  const passedResult = useMemo(
    () => (scoredQuestions.length ? markAttempt(scoredQuestions, perfect) : null),
    [scoredQuestions, perfect],
  );
  const failedResult = useMemo(() => {
    if (!scoredQuestions.length) return null;
    const firstCritical = scoredQuestions.find((q) => q.critical);
    if (!firstCritical) return null;
    const wrongOption = firstCritical.options.find((o) => !firstCritical.correct.includes(o.id));
    return markAttempt(scoredQuestions, {
      ...perfect,
      [firstCritical.id]: wrongOption ? [wrongOption.id] : [],
    });
  }, [scoredQuestions, perfect]);

  const coachingGate = assessmentGate({
    attempts: [
      { attempt_number: 1, status: "submitted", passed: false },
      { attempt_number: 2, status: "submitted", passed: false },
    ],
    coachingRecorded: false,
    mandatoryLessonsComplete: true,
  });
  const afterCoachingGate = assessmentGate({
    attempts: [
      { attempt_number: 1, status: "submitted", passed: false },
      { attempt_number: 2, status: "submitted", passed: false },
    ],
    coachingRecorded: true,
    mandatoryLessonsComplete: true,
  });

  const fohItems = observationItemsFor("foh");
  const kitchenItems = observationItemsFor("kitchen");
  const allSeen = (items: typeof fohItems) =>
    Object.fromEntries(items.map((i) => [i.ref, { seen: true }]));
  const fohMarking = markObservation(fohItems, allSeen(fohItems));
  const kitchenMarking = markObservation(kitchenItems, allSeen(kitchenItems));
  const criticalNotSeen = markObservation(kitchenItems, {
    ...allSeen(kitchenItems),
    [kitchenItems.find((i) => i.critical)?.ref ?? kitchenItems[0].ref]: { seen: false },
  });

  const gateAll = certificationGate({
    lessonsComplete: ALLERGEN_SAFETY_LESSONS.length,
    lessonsRequired: ALLERGEN_SAFETY_LESSONS.length,
    mandatoryOutstanding: [],
    assessment: { passed: true, scorePercent: 100, criticalMissed: [] },
    observation: {
      outcome: "passed",
      signedAt: new Date().toISOString(),
      signedByName: "Manager (demonstration)",
      signerIsAuthorisedManager: true,
    },
  });
  const gateLearning = certificationGate({
    lessonsComplete: 5,
    lessonsRequired: ALLERGEN_SAFETY_LESSONS.length,
    mandatoryOutstanding: ["Preventing cross-contact"],
    assessment: null,
    observation: null,
  });
  const gatePractical = certificationGate({
    lessonsComplete: ALLERGEN_SAFETY_LESSONS.length,
    lessonsRequired: ALLERGEN_SAFETY_LESSONS.length,
    mandatoryOutstanding: [],
    assessment: { passed: true, scorePercent: 94, criticalMissed: [] },
    observation: null,
  });

  /* ── Recorded outcomes, read from the existing acceptance record ── */
  const recordedOutcome = (env: string): WalkthroughOutcome | null => {
    const row = (signoffs as any[])
      .filter((s) => s.environment === env && (s.summary as any)?.walkthrough === "management_acceptance")
      .sort((a, b) => String(b.signed_at).localeCompare(String(a.signed_at)))[0];
    if (!row) return null;
    if (row.outcome === "accepted") return "pass";
    if (row.outcome === "accepted_with_observations") return "pass_with_comments";
    return "fail";
  };
  const readiness = walkthroughReadiness({
    phone: recordedOutcome("smartphone"),
    computer: recordedOutcome("desktop"),
  });

  const submitOutcome = async () => {
    if (!outcome) return;
    if (walkthroughCommentRequired(outcome) && !comment.trim()) {
      toast.error("Please write a comment for this result.");
      return;
    }
    if (!signerName.trim()) {
      toast.error("Please type the name of the person recording this walkthrough.");
      return;
    }
    const result = outcome === "fail" ? "fail" : outcome === "pass" ? "pass" : "pass_with_observation";
    try {
      for (const ref of ["lesson-resume", "certificate-display"]) {
        await recordCheck.mutateAsync({
          environment: environment as any,
          checkRef: ref,
          result: result as any,
          comment: comment.trim() || null,
        });
      }
      await sign.mutateAsync({
        environment: environment as any,
        outcome: walkthroughSignoffOutcome(outcome),
        signedByName: signerName.trim(),
        signedRole: "Management acceptance walkthrough",
        deviceNote: comment.trim() || null,
        summary: {
          walkthrough: "management_acceptance",
          device,
          site,
          steps: ALLERGEN_WALKTHROUGH_STEPS.length,
          minutes: WALKTHROUGH_TOTAL_MINUTES,
          result: outcome,
        },
      });
      toast.success(
        `${device === "mobile" ? "Phone" : "Computer"} walkthrough recorded as ${WALKTHROUGH_OUTCOME_LABELS[outcome]}. Nothing was published or sent.`,
      );
      setComment("");
      setOutcome(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not record this walkthrough");
    }
  };

  const frame = (children: React.ReactNode) =>
    device === "mobile" ? (
      <div className="mx-auto w-full max-w-[390px] rounded-xl border bg-background p-2">{children}</div>
    ) : (
      <div className="rounded-xl border bg-background p-3">{children}</div>
    );

  /* ───────────────── Step content ───────────────── */
  const stepBody = () => {
    switch (step.ref) {
      case "opening":
        return frame(
          <div className="space-y-2">
            <p className="text-sm font-semibold">{ALLERGEN_COURSE_TITLE}</p>
            <p className="text-xs text-muted-foreground">
              Everyone who takes, prepares or plates an order must handle an allergy request correctly,
              every time. This course is how we show that.
            </p>
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              <Badge variant="outline">{ALLERGEN_COURSE_MODULES.length} modules</Badge>
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" /> About {ALLERGEN_COURSE_TOTAL_MINUTES} min
              </Badge>
              <Badge variant="outline">Then a short assessment</Badge>
            </div>
            <Progress value={progress.percent} className="h-2" />
            <p className="text-[11px] text-muted-foreground">
              {progress.percent}% read — {progress.sectionsComplete} of {progress.sectionsTotal} sections saved.
            </p>
            <div className="space-y-1">
              {ALLERGEN_COURSE_MODULES.map((m) => {
                const state = moduleProgressState(m, demoProgress);
                return (
                  <div key={m.ref} className="rounded-md border p-2">
                    <p className="text-xs font-medium">
                      Module {m.order}. {m.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{m.summary}</p>
                    <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                      <Badge variant="outline">About {state.minutes} min</Badge>
                      <Badge variant={state.complete ? "secondary" : "outline"}>
                        {state.complete ? "Complete" : `${state.sectionsComplete}/${state.sectionsTotal} sections`}
                      </Badge>
                      {state.mandatory && <Badge variant="destructive">Required</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>,
        );

      case "module":
        return frame(
          <div className="space-y-3">
            <p className="text-sm font-semibold">
              Module {DEMO_MODULE.order}. {DEMO_MODULE.title}
            </p>
            {moduleLessons(DEMO_MODULE).map((lesson) => (
              <div key={lesson.ref} className="space-y-2">
                <p className="text-xs font-medium">{lesson.title}</p>
                {lesson.sections.map((s, i) => {
                  const done = (demoProgress[lesson.ref] ?? []).includes(s.ref);
                  return (
                    <div key={s.ref} className="rounded-md border p-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-medium">
                          {i + 1}. {s.heading}
                        </p>
                        {s.mandatory ? (
                          <Badge variant="destructive" className="text-[10px]">Required</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Extra reading</Badge>
                        )}
                      </div>
                      <div className="mt-1 space-y-1 text-xs leading-relaxed text-muted-foreground">
                        {s.paragraphs.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}
                      </div>
                      {s.example && (
                        <p className="mt-1 rounded-md bg-muted/60 p-2 text-[11px]">
                          <span className="font-medium">In service: </span>{s.example}
                        </p>
                      )}
                      <div className="mt-1 flex flex-wrap gap-1">
                        {s.sources.map((ref) => (
                          <Badge key={ref} variant="outline" className="gap-1 text-[10px]">
                            <ShieldCheck className="h-3 w-3" />
                            {courseSource(ref).title}
                          </Badge>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        variant={done ? "outline" : "default"}
                        className="mt-2 w-full"
                        disabled={done}
                        onClick={() => markSection(lesson.ref, s.ref)}
                      >
                        {done ? "Section completed" : "Mark this section completed"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>,
        );

      case "resume": {
        const module = moduleProgressState(DEMO_MODULE, awayFromScreen ? {} : demoProgress);
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setAwayFromScreen(true)}>
                <LogOut className="h-3.5 w-3.5" /> Leave the screen
              </Button>
              <Button
                size="sm"
                className="gap-1"
                onClick={() => {
                  setAwayFromScreen(false);
                  setDemoProgress(savedCopy ?? demoProgress);
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Come back to the course
              </Button>
            </div>
            {frame(
              awayFromScreen ? (
                <p className="p-4 text-center text-xs text-muted-foreground">
                  You have left the course. Your saved sections are held for when you return.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">
                    Module {DEMO_MODULE.order}. {DEMO_MODULE.title}
                  </p>
                  <Progress
                    value={module.sectionsTotal ? (module.sectionsComplete / module.sectionsTotal) * 100 : 0}
                    className="h-2"
                  />
                  <p className="text-xs">
                    {module.sectionsComplete} of {module.sectionsTotal} sections still saved after leaving and
                    coming back.
                  </p>
                  {module.sectionsComplete === 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      Mark a section or two on the previous stop, then leave and return here.
                    </p>
                  )}
                </div>
              ),
            )}
          </div>
        );
      }

      case "locked":
        return frame(
          <div className="space-y-2">
            <Progress value={progress.percent} className="h-2" />
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription className="text-xs">
                The assessment opens when every required module is complete. Still to read:{" "}
                {progress.mandatoryOutstanding.slice(0, 4).join(", ")}
                {progress.mandatoryOutstanding.length > 4
                  ? ` and ${progress.mandatoryOutstanding.length - 4} more`
                  : ""}
                .
              </AlertDescription>
            </Alert>
            <Button size="sm" disabled className="w-full">Open the assessment</Button>
          </div>,
        );

      case "question-types":
        return frame(
          <div className="space-y-3">
            {[singleQuestion, multiQuestion].map((q, idx) =>
              !q ? (
                <Alert key={idx} variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    No {idx === 0 ? "one-answer" : "select-all-that-apply"} question is currently scored for
                    this site. Nothing has been substituted.
                  </AlertDescription>
                </Alert>
              ) : (
                <div key={q.id} className="rounded-md border p-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px]">
                      {q.type === "multi" ? "Select all that apply" : "One answer"}
                    </Badge>
                    {q.critical && <Badge variant="destructive" className="text-[10px]">Critical safety</Badge>}
                  </div>
                  <p className="mt-1 text-xs font-medium">{q.prompt}</p>
                  <div className="mt-2 space-y-1">
                    {(bank?.optionOrder[q.id] ?? q.options.map((o) => o.id)).map((oid) => {
                      const option = q.options.find((o) => o.id === oid)!;
                      const chosen = (demoAnswers[q.id] ?? []).includes(oid);
                      return (
                        <label key={oid} className="flex items-start gap-2 rounded-md border p-2 text-xs">
                          <Checkbox
                            checked={chosen}
                            onCheckedChange={() =>
                              setDemoAnswers((prev) => {
                                const current = prev[q.id] ?? [];
                                if (q.type === "multi") {
                                  return {
                                    ...prev,
                                    [q.id]: current.includes(oid)
                                      ? current.filter((x) => x !== oid)
                                      : [...current, oid],
                                  };
                                }
                                return { ...prev, [q.id]: [oid] };
                              })
                            }
                          />
                          <span>{option.text}</span>
                        </label>
                      );
                    })}
                  </div>
                  {(demoAnswers[q.id] ?? []).length > 0 && (
                    <p className="mt-2 rounded-md bg-muted/60 p-2 text-[11px]">
                      {[...(demoAnswers[q.id] ?? [])].sort().join("|") === [...q.correct].sort().join("|")
                        ? "Correct. "
                        : "Not correct. "}
                      {q.explanation}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap gap-1">
                    {q.sources.map((ref) => (
                      <Badge key={ref} variant="outline" className="text-[10px]">{courseSource(ref).title}</Badge>
                    ))}
                  </div>
                </div>
              ),
            )}
          </div>,
        );

      case "branch-question":
        return (
          <div className="space-y-3">
            {frame(
              menuQuestion ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-[10px]">Current menu at {site}</Badge>
                    {menuQuestion.flavour && (
                      <Badge variant="outline" className="text-[10px]">{menuQuestion.flavour}</Badge>
                    )}
                  </div>
                  <p className="text-xs font-medium">{menuQuestion.prompt}</p>
                  {menuQuestion.options.map((o) => (
                    <p
                      key={o.id}
                      className={`text-xs ${menuQuestion.correct.includes(o.id) ? "font-medium" : "text-muted-foreground"}`}
                    >
                      {menuQuestion.correct.includes(o.id) ? "✔ " : "• "}{o.text}
                    </p>
                  ))}
                  <p className="text-[11px] text-muted-foreground">{menuQuestion.explanation}</p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No current-menu question is scored for {site} at the moment. Nothing has been substituted or
                  guessed.
                </p>
              ),
            )}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Checked against the approved menu records</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs">
                <Badge variant={siteValidation.ok ? "secondary" : "destructive"} className="text-[10px]">
                  {siteValidation.ok ? "Matches the approved records" : "Does not match — do not proceed"}
                </Badge>
                {siteValidation.findings.map((f) => (
                  <p key={`${f.flavour}-${f.expectation}`} className="flex items-center gap-1.5">
                    {f.ok ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-destructive" />
                    )}
                    <span className="font-medium">{f.flavour}</span>
                    <span className="text-muted-foreground">
                      {f.expectation === "may_include"
                        ? f.present ? "— allowed here and included." : "— allowed here, not currently eligible."
                        : f.present ? "— MUST NOT appear here, but it did." : "— correctly absent here."}
                    </span>
                  </p>
                ))}
                <p className="pt-1 text-muted-foreground">
                  Scored flavours: {scoredFlavours.length ? scoredFlavours.join(", ") : "none"}.
                </p>
              </CardContent>
            </Card>
          </div>
        );

      case "critical-failure":
        return frame(
          failedResult ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="destructive">Not passed</Badge>
                <Badge variant="outline">{failedResult.scorePercent}% scored</Badge>
                <Badge variant="outline">Pass mark {ALLERGEN_PASS_MARK}%</Badge>
              </div>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {failedResult.criticalMissed.length} critical-safety question answered incorrectly. A
                  critical question must be right, whatever the overall score.
                </AlertDescription>
              </Alert>
              {failedResult.marked
                .filter((m) => !m.correct)
                .map((m) => (
                  <p key={m.question_id} className="rounded-md border p-2 text-[11px]">
                    {m.explanation}
                  </p>
                ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No scored questions available for this site.</p>
          ),
        );

      case "coaching-lock":
        return frame(
          <div className="space-y-2">
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription className="text-xs">{coachingGate.message}</AlertDescription>
            </Alert>
            <Button size="sm" disabled={!coachingGate.canStartAttempt} className="w-full">
              Start the assessment
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Once a manager records coaching: {afterCoachingGate.message}
            </p>
          </div>,
        );

      case "passed":
        return frame(
          passedResult ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary">Assessment passed — awaiting practical sign-off</Badge>
                <Badge variant="outline">{passedResult.scorePercent}%</Badge>
                <Badge variant="outline">{passedResult.total} scored questions</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Passing the questions is not a completed course and is not a certificate. A manager must still
                see the work done correctly in service.
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No scored questions available for this site.</p>
          ),
        );

      case "practical":
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              ["Front of house", fohItems, fohMarking],
              ["Kitchen", kitchenItems, kitchenMarking],
            ] as const).map(([label, items, marking]) => (
              <Card key={label}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <ClipboardCheck className="h-4 w-4" /> {label}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {items.length} lines for this role. Every line seen, signed by a manager.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 text-xs">
                  <Badge variant="secondary" className="text-[10px]">
                    All seen — would sign as {marking.outcome === "passed" ? "passed" : marking.outcome}
                  </Badge>
                  {items.slice(0, 6).map((i) => (
                    <p key={i.ref} className="text-muted-foreground">
                      • {i.title}
                      {i.critical ? " (critical)" : ""}
                    </p>
                  ))}
                  {items.length > 6 && (
                    <p className="text-muted-foreground">and {items.length - 6} more lines.</p>
                  )}
                </CardContent>
              </Card>
            ))}
            <Alert className="sm:col-span-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                With one critical kitchen line not seen, the same observation signs as “
                {criticalNotSeen.outcome === "not_yet_competent" ? "not yet competent" : criticalNotSeen.outcome}
                ”. A signed observation can never be edited — a fresh observation is recorded instead.
              </AlertDescription>
            </Alert>
          </div>
        );

      case "gates":
        return (
          <div className="space-y-2">
            {([
              ["Learning not finished", gateLearning],
              ["Assessment passed, practical outstanding", gatePractical],
              ["All three gates met", gateAll],
            ] as const).map(([label, g]) => (
              <Card key={label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{label}</CardTitle>
                  <CardDescription className="text-xs">{g.status}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 text-xs">
                  <Badge variant={g.eligible ? "secondary" : "outline"} className="text-[10px]">
                    {g.eligible ? "A certificate may be issued" : "No certificate"}
                  </Badge>
                  {g.blockers.map((b) => (
                    <p key={b} className="text-muted-foreground">• {b}</p>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case "certificate":
        return frame(
          <div className="space-y-2 rounded-md border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Award className="h-4 w-4" />
              <p className="text-sm font-semibold">{ALLERGEN_COURSE_TITLE}</p>
              <Badge variant="destructive" className="text-[10px]">Preview — issued to nobody</Badge>
            </div>
            <div className="grid gap-1 text-xs sm:grid-cols-2">
              <p><span className="text-muted-foreground">Reference: </span>{certificateNumber(1, new Date().getFullYear(), true)}</p>
              <p><span className="text-muted-foreground">Course version: </span>proposed {draft?.proposed_version ?? "2"} (draft)</p>
              <p><span className="text-muted-foreground">Assessment score: </span>{passedResult?.scorePercent ?? "—"}%</p>
              <p><span className="text-muted-foreground">Practical signed by: </span>Manager (demonstration)</p>
              <p><span className="text-muted-foreground">Site: </span>{site}</p>
              <p><span className="text-muted-foreground">Valid from: </span>{new Date().toISOString().slice(0, 10)}</p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              A demonstration layout only. No certificate record exists and nothing has been issued.
            </p>
          </div>,
        );

      case "publish":
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Publish and Send</CardTitle>
              <CardDescription className="text-xs">
                Shown here so you can see them. Both live on the Pilot tab and both stay your decision.
                Publishing contacts nobody; sending the pilot needs your separate approval.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="gap-1" disabled>
                  <Upload className="h-3.5 w-3.5" /> Publish for the controlled pilot
                </Button>
                <Button size="sm" variant="outline" className="gap-1" disabled>
                  <Send className="h-3.5 w-3.5" /> Send the pilot — needs your separate approval
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Automatic reminders remain switched off. Version 1 and every existing assignment,
                certificate and historical record are untouched.
              </p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="space-y-3">
      {/* ── Controls ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            Management acceptance walkthrough
            <Badge variant="destructive">Demonstration only — nothing counts</Badge>
          </CardTitle>
          <CardDescription className="text-xs">
            {ALLERGEN_WALKTHROUGH_STEPS.length} stops, about {WALKTHROUGH_TOTAL_MINUTES} minutes.{" "}
            {WALKTHROUGH_SCOPE_NOTE}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant={device === "mobile" ? "default" : "outline"} className="gap-1"
              onClick={() => setDevice("mobile")}>
              <Smartphone className="h-3.5 w-3.5" /> Phone preview
            </Button>
            <Button size="sm" variant={device === "desktop" ? "default" : "outline"} className="gap-1"
              onClick={() => setDevice("desktop")}>
              <Monitor className="h-3.5 w-3.5" /> Computer preview
            </Button>
            <Select value={site} onValueChange={setSite}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {UD_SITES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2 text-[10px]">
            <Badge variant={readiness.phonePassed ? "secondary" : "outline"}>
              Phone walkthrough: {readiness.phonePassed ? "passed" : "not passed yet"}
            </Badge>
            <Badge variant={readiness.computerPassed ? "secondary" : "outline"}>
              Computer walkthrough: {readiness.computerPassed ? "passed" : "not passed yet"}
            </Badge>
            <Badge variant={readiness.readyToPublish ? "secondary" : "outline"}>
              {readiness.readyToPublish
                ? "Version 2 ready to publish for the controlled pilot — awaiting your approval"
                : "Version 2 not marked ready"}
            </Badge>
            <Badge variant="outline">
              Up to {ALLERGEN_MAX_SCORED_QUESTIONS} scored questions — {scoredQuestions.filter((q) => q.critical).length}{" "}
              critical of {CRITICAL_QUESTION_COUNT} written
            </Badge>
          </div>

          {evidenceWarnings.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="space-y-0.5 text-xs">
                <p className="font-medium">
                  {evidenceWarnings.length} critical question(s) have lost their confirmed supporting
                  evidence and are not scored at {site}. The safety rule is still taught in the lessons.
                </p>
                {evidenceWarnings.map((w) => (
                  <p key={w.id}>{w.flavour ?? w.id} — {w.reason}</p>
                ))}
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Never scored: {EXCLUDED_FROM_SCORING.map((e) => e.flavour).join(", ")}. Nothing inactive,
              historical or reference-only appears in a scored question.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* ── The current stop ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {step.order} of {ALLERGEN_WALKTHROUGH_STEPS.length}. {step.title}
          </CardTitle>
          <CardDescription className="text-xs">{step.look_for}</CardDescription>
          <Progress
            value={((stepIndex + 1) / ALLERGEN_WALKTHROUGH_STEPS.length) * 100}
            className="mt-2 h-1.5"
          />
        </CardHeader>
        <CardContent className="space-y-3">
          {stepBody()}
          <div className="flex flex-wrap justify-between gap-2">
            <Button size="sm" variant="outline" className="gap-1" disabled={stepIndex === 0}
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}>
              <ChevronLeft className="h-3.5 w-3.5" /> Back
            </Button>
            <Button size="sm" className="gap-1"
              disabled={stepIndex === ALLERGEN_WALKTHROUGH_STEPS.length - 1}
              onClick={() => setStepIndex((i) => Math.min(ALLERGEN_WALKTHROUGH_STEPS.length - 1, i + 1))}>
              Next stop <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Record the result ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Record the {device === "mobile" ? "phone" : "computer"} walkthrough
          </CardTitle>
          <CardDescription className="text-xs">
            A comment is required for “Pass with comments” and for “Fail”. Recording a result publishes
            nothing and contacts nobody.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {(["pass", "pass_with_comments", "fail"] as WalkthroughOutcome[]).map((o) => (
              <Button key={o} size="sm" variant={outcome === o ? "default" : "outline"}
                onClick={() => setOutcome(o)}>
                {WALKTHROUGH_OUTCOME_LABELS[o]}
              </Button>
            ))}
          </div>
          {outcome && walkthroughCommentRequired(outcome) && (
            <div>
              <Label className="text-xs">Comment (required)</Label>
              <Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)}
                placeholder="What did you see that needs recording?" className="mt-1" />
            </div>
          )}
          <div>
            <Label className="text-xs">Name of the person recording this</Label>
            <Input value={signerName} onChange={(e) => setSignerName(e.target.value)}
              placeholder="Full name" className="mt-1 w-full sm:w-72" />
          </div>
          <Button size="sm" disabled={!outcome || recordCheck.isPending || sign.isPending}
            onClick={submitOutcome}>
            Record this walkthrough
          </Button>

          {readiness.outstanding.length > 0 ? (
            <Alert>
              <AlertDescription className="space-y-0.5 text-xs">
                {readiness.outstanding.map((o) => <p key={o}>{o}</p>)}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Both walkthroughs have passed. Version 2 is marked ready to publish for the controlled
                pilot. It has not been published, no pilot assignment has been sent and automatic reminders
                remain off — Publish is on the Pilot tab and waits for your approval.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
