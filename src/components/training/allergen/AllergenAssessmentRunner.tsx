/**
 * Allergen assessment for the learner.
 *
 * Rules enforced here and in src/lib/allergen-course.ts:
 *  • 80% to pass AND every critical-safety question correct.
 *  • Two independent attempts, then "Manager coaching required".
 *  • Answers are saved as the learner goes, so closing the page loses nothing.
 *  • No correct answer or explanation is shown until the attempt is submitted.
 *  • Passing produces "Assessment passed — awaiting practical sign-off" only —
 *    no course completion and no certificate in Phase 1.
 */

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Lock } from "lucide-react";
import { toast } from "sonner";
import { ALLERGEN_QUESTION_BANK } from "@/data/allergen/allergen-safety-questions";
import { ALLERGEN_SAFETY_LESSONS } from "@/data/allergen/allergen-safety-lessons";
import { courseSource } from "@/data/allergen/allergen-course-sources";
import {
  ALLERGEN_PASS_MARK, assessmentGate, courseProgress, markAttempt, selectQuestionBank,
  type AllergenQuestion,
} from "@/lib/allergen-course";
import {
  useAllergenAttempts, useAllergenCoaching, useAllergenLessonProgress,
  useSaveAttemptAnswers, useStartAllergenAttempt, useSubmitAllergenAttempt,
} from "@/hooks/useAllergenCourse";
import { useAllergenDishes, useAllergenConflicts } from "@/hooks/useAllergenLibrary";

export function AllergenAssessmentRunner({
  isTest, branchId, branchName, courseVersionLabel, draftId, employeeId,
}: {
  isTest: boolean;
  branchId: string | null;
  branchName?: string;
  courseVersionLabel: string;
  draftId?: string | null;
  employeeId?: string | null;
}) {
  const { data: dishes = [] } = useAllergenDishes();
  const { data: conflicts = [] } = useAllergenConflicts();
  const { data: attempts = [] } = useAllergenAttempts(isTest);
  const { data: coaching = [] } = useAllergenCoaching(isTest);
  const { data: progressRows = [] } = useAllergenLessonProgress(isTest);

  const start = useStartAllergenAttempt();
  const saveAnswers = useSaveAttemptAnswers();
  const submit = useSubmitAllergenAttempt();

  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [reviewing, setReviewing] = useState(false);

  const openAttempt = attempts.find((a) => a.status === "in_progress") ?? null;
  const lastSubmitted = [...attempts].reverse().find((a) => a.status === "submitted") ?? null;

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

  const gate = assessmentGate({
    attempts: attempts.map((a) => ({
      attempt_number: a.attempt_number, status: a.status, passed: a.passed,
    })),
    coachingRecorded: coaching.length > 0,
    mandatoryLessonsComplete: progress.assessmentOpen,
  });

  const selection = useMemo(
    () =>
      selectQuestionBank({
        bank: ALLERGEN_QUESTION_BANK,
        dishes: dishes.map((d) => ({
          dish_name: d.dish_name,
          is_confirmed: d.is_confirmed,
          management_decision: d.management_decision,
          active_branch_ids: d.active_branch_ids,
        })),
        conflicts: conflicts.map((c) => ({ subject: c.subject, status: c.status })),
        branchId,
        seed: openAttempt?.id ?? `preview:${branchId ?? "none"}`,
      }),
    [dishes, conflicts, branchId, openAttempt?.id],
  );

  /* Resume: load saved answers and keep the same question set and answer order. */
  useEffect(() => {
    if (openAttempt) setAnswers((openAttempt.answers as Record<string, string[]>) ?? {});
  }, [openAttempt?.id]);

  const attemptQuestions: AllergenQuestion[] = useMemo(() => {
    if (!openAttempt) return selection.questions;
    const byId = new Map(ALLERGEN_QUESTION_BANK.map((q) => [q.id, q]));
    return openAttempt.question_ids.map((id) => byId.get(id)).filter(Boolean) as AllergenQuestion[];
  }, [openAttempt, selection.questions]);

  const orderedOptions = (q: AllergenQuestion) => {
    const order = (openAttempt?.option_order as Record<string, string[]>)?.[q.id]
      ?? selection.optionOrder[q.id]
      ?? q.options.map((o) => o.id);
    return order.map((id) => q.options.find((o) => o.id === id)!).filter(Boolean);
  };

  const toggle = (q: AllergenQuestion, optionId: string) => {
    setAnswers((prev) => {
      const current = prev[q.id] ?? [];
      const next =
        q.type === "multi"
          ? current.includes(optionId)
            ? current.filter((id) => id !== optionId)
            : [...current, optionId]
          : [optionId];
      const updated = { ...prev, [q.id]: next };
      if (openAttempt) saveAnswers.mutate({ attemptId: openAttempt.id, answers: updated });
      return updated;
    });
  };

  const beginAttempt = () => {
    start.mutate(
      {
        attemptNumber: gate.nextAttemptNumber,
        questionIds: selection.questions.map((q) => q.id),
        optionOrder: selection.optionOrder,
        branchId,
        draftId: draftId ?? null,
        employeeId: employeeId ?? null,
        isTest,
      },
      {
        onSuccess: () => {
          setAnswers({});
          setReviewing(false);
          toast.success(isTest ? "Test attempt started — nothing is recorded against a real employee." : "Attempt started.");
        },
        onError: (e: any) => toast.error(e.message ?? "Could not start the attempt"),
      },
    );
  };

  const doSubmit = () => {
    if (!openAttempt) return;
    const result = markAttempt(attemptQuestions, answers);
    submit.mutate(
      {
        attemptId: openAttempt.id,
        answers,
        scorePercent: result.scorePercent,
        criticalMissed: result.criticalMissed,
        passed: result.passed,
        attemptNumber: openAttempt.attempt_number,
        isTest,
      },
      {
        onSuccess: () => {
          setReviewing(true);
          toast.success(
            result.passed
              ? "Assessment passed — awaiting practical sign-off."
              : `Not passed: ${result.scorePercent}%${result.criticalMissed.length ? `, ${result.criticalMissed.length} critical question(s) missed` : ""}.`,
          );
        },
        onError: (e: any) => toast.error(e.message ?? "Could not submit the attempt"),
      },
    );
  };

  const marked = reviewing && lastSubmitted
    ? markAttempt(attemptQuestions, (lastSubmitted.answers as Record<string, string[]>) ?? answers)
    : null;

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="h-4 w-4" />
            Allergen assessment
          </CardTitle>
          <CardDescription>
            {ALLERGEN_PASS_MARK}% to pass, and every critical-safety question must be correct. Two
            attempts; after that a manager records coaching before a further attempt opens. Passing
            means “Assessment passed — awaiting practical sign-off” — the course is not complete and
            no certificate is issued.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{courseVersionLabel}</Badge>
            <Badge variant="outline">{branchName ? `Site: ${branchName}` : "No site selected"}</Badge>
            <Badge variant="outline">{selection.questions.length} questions in this bank</Badge>
            <Badge variant="outline">
              {selection.questions.filter((q) => q.critical).length} critical-safety questions
            </Badge>
            {isTest && <Badge variant="destructive">Test mode — nothing counts</Badge>}
          </div>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">{gate.message}</AlertDescription>
          </Alert>
          {!openAttempt && gate.canStartAttempt && (
            <Button size="sm" onClick={beginAttempt} disabled={start.isPending}>
              Start attempt {gate.nextAttemptNumber}
            </Button>
          )}
          {gate.status === "manager_coaching_required" && (
            <p className="flex items-center gap-1 text-destructive">
              <Lock className="h-3 w-3" /> Manager coaching required before a third attempt.
            </p>
          )}
        </CardContent>
      </Card>

      {selection.excluded.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Deliberately left out of the scored exam</CardTitle>
            <CardDescription className="text-xs">
              Kept in the reference library, never scored until management confirms the evidence.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-xs text-muted-foreground">
            {selection.excluded.map((e) => (
              <p key={e.id}>
                <span className="font-medium text-foreground">{e.flavour ?? e.id}</span> — {e.reason}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {openAttempt && !reviewing && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Attempt {openAttempt.attempt_number}</CardTitle>
            <CardDescription className="text-xs">
              Your answers are saved as you choose them. You can close this and come back.
            </CardDescription>
            <Progress
              value={(Object.values(answers).filter((a) => a.length).length / Math.max(attemptQuestions.length, 1)) * 100}
              className="mt-2 h-1.5"
            />
          </CardHeader>
          <CardContent className="space-y-4">
            {attemptQuestions.map((q, i) => (
              <div key={q.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-medium">
                    {i + 1}. {q.prompt}
                  </p>
                  <div className="flex gap-1">
                    {q.critical && <Badge variant="destructive" className="text-[10px]">Critical safety</Badge>}
                    {q.type === "multi" && <Badge variant="outline" className="text-[10px]">Choose all that apply</Badge>}
                    {q.type === "scenario" && <Badge variant="outline" className="text-[10px]">Scenario</Badge>}
                  </div>
                </div>
                <div className="mt-2 space-y-2">
                  {orderedOptions(q).map((opt) => {
                    const chosen = (answers[q.id] ?? []).includes(opt.id);
                    return (
                      <label
                        key={opt.id}
                        className="flex cursor-pointer items-start gap-2 rounded-md border p-2 text-sm hover:bg-muted/50"
                      >
                        <Checkbox checked={chosen} onCheckedChange={() => toggle(q, opt.id)} className="mt-0.5" />
                        <span>{opt.text}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
            <Button
              size="sm"
              onClick={doSubmit}
              disabled={submit.isPending || Object.values(answers).filter((a) => a.length).length < attemptQuestions.length}
            >
              Submit this attempt
            </Button>
            <p className="text-xs text-muted-foreground">
              Answer every question before submitting. Correct answers are only shown afterwards.
            </p>
          </CardContent>
        </Card>
      )}

      {marked && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              {marked.passed ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {marked.passed ? "Assessment passed — awaiting practical sign-off" : "Not passed"}
            </CardTitle>
            <CardDescription className="text-xs">
              {marked.scorePercent}% ({marked.correctCount} of {marked.total}).{" "}
              {marked.criticalMissed.length
                ? `${marked.criticalMissed.length} critical-safety question(s) answered incorrectly, so the attempt cannot pass whatever the score.`
                : "Every critical-safety question correct."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {marked.marked.map((m, i) => {
              const q = attemptQuestions.find((x) => x.id === m.question_id)!;
              return (
                <div key={m.question_id} className="rounded-md border p-2 text-xs">
                  <p className="font-medium">
                    {i + 1}. {q?.prompt}
                  </p>
                  <p className={m.correct ? "text-muted-foreground" : "text-destructive"}>
                    {m.correct ? "Correct" : "Incorrect"}
                    {q?.critical ? " — critical safety" : ""}
                  </p>
                  <p className="mt-1 text-muted-foreground">{m.explanation}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(q?.sources ?? []).map((ref) => (
                      <Badge key={ref} variant="outline" className="text-[10px]">
                        {courseSource(ref).title}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {attempts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Attempt history</CardTitle>
            <CardDescription className="text-xs">Every attempt is kept, passed or not.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            {attempts.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2">
                <span>
                  Attempt {a.attempt_number} — {a.status === "in_progress" ? "in progress" : `${a.score_percent ?? 0}%`}
                </span>
                <div className="flex gap-1">
                  {a.is_test && <Badge variant="destructive" className="text-[10px]">Test</Badge>}
                  {a.outcome && (
                    <Badge variant="outline" className="text-[10px]">
                      {a.outcome === "passed_awaiting_practical"
                        ? "Passed — awaiting practical sign-off"
                        : a.outcome === "manager_coaching_required"
                          ? "Manager coaching required"
                          : "Not passed"}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
