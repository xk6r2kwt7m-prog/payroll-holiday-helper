/**
 * Learner lesson reader for Ugly Dumpling Allergen Safety.
 *
 * Reads on a phone or a computer, one lesson at a time. Progress only moves
 * when the learner marks a section complete — opening a lesson earns nothing.
 * Every section names its sources. Nothing is printed or downloaded.
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BookOpen, CheckCircle2, Clock, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  ALLERGEN_SAFETY_LESSONS,
  ALLERGEN_COURSE_TITLE,
  ALLERGEN_COURSE_TOTAL_MINUTES,
} from "@/data/allergen/allergen-safety-lessons";
import { courseSource } from "@/data/allergen/allergen-course-sources";
import { courseProgress, lessonIsComplete, type AllergenLesson } from "@/lib/allergen-course";
import { useAllergenLessonProgress, useSaveSectionProgress } from "@/hooks/useAllergenCourse";

export function AllergenLessonReader({
  isTest, courseVersionLabel, draftId, employeeId, onAssessmentOpen, previewKey, dueDate, personaLabel,
}: {
  isTest: boolean;
  courseVersionLabel: string;
  draftId?: string | null;
  employeeId?: string | null;
  onAssessmentOpen?: () => void;
  /** Isolates a management preview session; genuine reading has no preview key. */
  previewKey?: string | null;
  dueDate?: string | null;
  personaLabel?: string;
}) {
  const { data: progressRows = [] } = useAllergenLessonProgress(isTest, previewKey ?? null);
  const save = useSaveSectionProgress();
  const [openLesson, setOpenLesson] = useState<string | null>(null);

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

  const completedSections = (lessonRef: string) =>
    progressRows.find((p) => p.lesson_ref === lessonRef)?.completed_sections ?? [];

  const markSection = (lesson: AllergenLesson, sectionRef: string) => {
    save.mutate(
      {
        lessonRef: lesson.ref,
        sectionRef,
        totalSections: lesson.sections.length,
        isTest,
        draftId: draftId ?? null,
        employeeId: employeeId ?? null,
        previewKey: previewKey ?? null,
      },
      {
        onSuccess: () => toast.success("Section saved — you can leave and continue later."),
        onError: (e: any) => toast.error(e.message ?? "Could not save your progress"),
      },
    );
  };

  const active = ALLERGEN_SAFETY_LESSONS.find((l) => l.ref === openLesson) ?? null;

  if (active) {
    const done = completedSections(active.ref);
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={() => setOpenLesson(null)}>
          ← All lessons
        </Button>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {active.order}. {active.title}
            </CardTitle>
            <CardDescription>{active.summary}</CardDescription>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" /> About {active.estimated_minutes} min
              </Badge>
              <Badge variant="outline">
                {done.length} of {active.sections.length} sections saved
              </Badge>
              <Badge variant="outline">{courseVersionLabel}</Badge>
            </div>
            <Progress value={(done.length / active.sections.length) * 100} className="mt-2 h-1.5" />
          </CardHeader>
          <CardContent className="space-y-4">
            {active.sections.map((s, i) => {
              const complete = done.includes(s.ref);
              return (
                <div key={s.ref} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      {i + 1}. {s.heading}
                    </p>
                    <div className="flex items-center gap-1.5">
                      {s.mandatory ? (
                        <Badge variant="destructive" className="text-[10px]">Required</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Extra reading</Badge>
                      )}
                      {complete && (
                        <Badge variant="secondary" className="gap-1 text-[10px]">
                          <CheckCircle2 className="h-3 w-3" /> Saved
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">
                    {s.paragraphs.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}
                  </div>
                  {s.example && (
                    <div className="mt-2 rounded-md bg-muted/60 p-2 text-xs">
                      <span className="font-medium">In service: </span>
                      {s.example}
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {s.sources.map((ref) => (
                      <Badge key={ref} variant="outline" className="gap-1 text-[10px]">
                        <ShieldCheck className="h-3 w-3" />
                        {courseSource(ref).title}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant={complete ? "outline" : "default"}
                    className="mt-3 w-full sm:w-auto"
                    disabled={complete || save.isPending}
                    onClick={() => markSection(active, s.ref)}
                  >
                    {complete ? "Section completed" : "Mark this section completed"}
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4" />
            {ALLERGEN_COURSE_TITLE}
          </CardTitle>
          <CardDescription className="space-y-1">
            <span className="block">
              Why you have this: everyone who takes an order, prepares food or plates food must be able
              to handle an allergy request correctly, every time. This course is how we show that.
            </span>
            <span className="block">
              Sixteen short lessons, about {ALLERGEN_COURSE_TOTAL_MINUTES} minutes in total. Your place is
              saved every time you mark a section completed, so you can stop and pick it up later. The
              assessment opens once every required lesson is finished.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline">{courseVersionLabel}</Badge>
            {personaLabel && <Badge variant="outline">{personaLabel}</Badge>}
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" /> About {ALLERGEN_COURSE_TOTAL_MINUTES} min in total
            </Badge>
            <Badge variant="outline">
              {progress.lessonsComplete} of {progress.lessonsTotal} lessons complete
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" /> About {progress.estimatedMinutesRemaining} min left
            </Badge>
            <Badge variant={dueDate ? "secondary" : "outline"}>
              {dueDate ? `Due by ${dueDate}` : "No due date set"}
            </Badge>
          </div>
          <Progress value={progress.percent} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {progress.percent}% of the course read — {progress.sectionsComplete} of{" "}
            {progress.sectionsTotal} sections saved.
          </p>
          {progress.assessmentOpen ? (
            <Button size="sm" onClick={onAssessmentOpen}>Open the assessment</Button>
          ) : (
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription className="text-xs">
                The assessment opens when every required lesson is complete. Still to read:{" "}
                {progress.mandatoryOutstanding.slice(0, 4).join(", ")}
                {progress.mandatoryOutstanding.length > 4
                  ? ` and ${progress.mandatoryOutstanding.length - 4} more`
                  : ""}
                .
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        {ALLERGEN_SAFETY_LESSONS.map((lesson) => {
          const done = completedSections(lesson.ref);
          const complete = lessonIsComplete(lesson, done);
          return (
            <button
              key={lesson.ref}
              onClick={() => setOpenLesson(lesson.ref)}
              className="w-full rounded-md border p-3 text-left transition-colors hover:bg-muted/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {lesson.order}. {lesson.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{lesson.summary}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge variant={complete ? "secondary" : "outline"} className="text-[10px]">
                    {complete ? "Complete" : `${done.length}/${lesson.sections.length}`}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{lesson.estimated_minutes} min</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
