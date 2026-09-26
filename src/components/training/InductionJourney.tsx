/**
 * InductionJourney — the staff-facing web induction.
 *
 * Phone-first. One lesson at a time, read on screen instead of as a PDF.
 * A lesson only appears once a manager has released that exact version.
 * Confirming a lesson records the version read; nothing is ever rewritten.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  BookOpen, CheckCircle2, ChevronRight, Clock, GraduationCap, Lock, RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LessonViewer } from "@/components/training/LessonViewer";
import {
  PACK_ROLE_LABELS, completedAnOlderVersion, estimatedPackMinutes, getInductionPack,
  isLessonApproved, isLessonComplete, lessonContentFor, lessonVersion, nextLesson,
  packProgressPercent, packStatusSummary, releasedLessons, suggestPackForJobTitle,
  type InductionLessonRef, type InductionPackRole,
} from "@/lib/induction-packs";
import { useCompleteLesson, useLessonApprovals, useLessonProgress } from "@/hooks/useInductionLessons";

interface InductionJourneyProps {
  employeeId: string;
  tenantId: string;
  /** Used to choose the right pack. Falls back to Front of House. */
  department?: string | null;
}

export function InductionJourney({ employeeId, tenantId, department }: InductionJourneyProps) {
  const role: InductionPackRole = suggestPackForJobTitle(department);
  const pack = getInductionPack(role);

  const approvalsQuery = useLessonApprovals();
  const { data: approvals = [], isLoading: loadingApprovals } = approvalsQuery;
  const progressQuery = useLessonProgress(employeeId);
  const { data: progress = [], isLoading: loadingProgress } = progressQuery;
  const complete = useCompleteLesson();

  const [openLesson, setOpenLesson] = useState<InductionLessonRef | null>(null);

  if (loadingApprovals || loadingProgress) {
    return <div className="h-24 rounded-xl bg-muted/40 animate-pulse" />;
  }

  if (approvalsQuery.isError || progressQuery.isError) {
    return <div role="alert" className="rounded-xl border p-4 space-y-3"><p>We could not load your induction progress. Please try again.</p><Button variant="outline" onClick={() => { void approvalsQuery.refetch(); void progressQuery.refetch(); }}>Try again</Button></div>;
  }

  const released = releasedLessons(role, approvals);
  const percent = packProgressPercent(role, approvals, progress);
  const upNext = nextLesson(role, approvals, progress);
  const minutes = estimatedPackMinutes(role, approvals);

  const content = openLesson ? lessonContentFor(openLesson) : null;

  return (
    <div className="space-y-3">
      {/* Pack header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card p-4 space-y-3"
      >
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <GraduationCap className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{pack.name}</p>
            <p className="text-xs text-muted-foreground">
              {PACK_ROLE_LABELS[role]} · {pack.audience}
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0">
            {percent}%
          </Badge>
        </div>

        <Progress value={percent} className="h-1.5" />

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {packStatusSummary(role, approvals, progress)}
          </p>
          {minutes > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
              <Clock className="h-3 w-3" /> about {minutes} min
            </span>
          )}
        </div>

        {upNext && (
          <Button className="w-full" size="lg" onClick={() => setOpenLesson(upNext)}>
            <BookOpen className="h-4 w-4 mr-2" />
            {percent === 0 ? "Start" : "Continue"} — {upNext.title}
          </Button>
        )}
      </motion.div>

      {/* Lesson list */}
      <div className="space-y-2">
        {pack.lessons.map((lesson, i) => {
          const approved = isLessonApproved(approvals, lesson);
          const done = isLessonComplete(progress, lesson);
          const updated = completedAnOlderVersion(progress, lesson);

          return (
            <motion.button
              key={lesson.key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              disabled={!approved}
              onClick={() => approved && setOpenLesson(lesson)}
              className={cn(
                "w-full text-left rounded-xl border p-3.5 flex items-center gap-3 transition-colors",
                approved ? "bg-card border-border active:bg-muted" : "bg-muted/30 border-border/50",
                done && "border-success/40"
              )}
            >
              <div
                className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                  done
                    ? "bg-success/10 text-success"
                    : approved
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {done ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : approved ? (
                  <BookOpen className="h-4 w-4" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium break-words">{lesson.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {approved ? lesson.summary : "Being prepared by your manager"}
                </p>
                {updated && (
                  <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-warning">
                    <RotateCcw className="h-3 w-3" /> Updated since you read it
                  </span>
                )}
              </div>

              {approved && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
            </motion.button>
          );
        })}
      </div>

      {released.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Your induction is being prepared. You will see it here as soon as it is ready.
        </p>
      )}

      {/* Lesson reader */}
      <Dialog open={!!openLesson} onOpenChange={(o) => !o && setOpenLesson(null)}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base pr-6">{openLesson?.title}</DialogTitle>
          </DialogHeader>
          {content && openLesson && (
            <LessonViewer
              lesson={content}
              onLessonComplete={
                isLessonComplete(progress, openLesson)
                  ? undefined
                  : async () => {
                      await complete.mutateAsync({
                        tenantId,
                        employeeId,
                        packRole: role,
                        lessonKey: openLesson.key,
                        lessonVersion: lessonVersion(openLesson),
                      });
                      setOpenLesson(null);
                    }
              }
            />
          )}
          {!content && (
            <p className="text-sm text-muted-foreground">
              This lesson is not available yet. Please ask your manager.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
