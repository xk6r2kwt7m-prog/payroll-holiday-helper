/**
 * InductionLessonsPanel — manager control over the web induction lessons.
 *
 * Managers preview each lesson, then release it to staff or hold it back.
 * Nothing reaches staff until it is released. Releasing is version-specific:
 * if a lesson is later rewritten, the new version needs releasing again and
 * completed records of the old version stay exactly as they are.
 */

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen, CheckCircle2, Eye, GraduationCap, ShieldAlert, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LessonViewer } from "@/components/training/LessonViewer";
import {
  INDUCTION_PACKS, PACK_ROLE_LABELS, approvalStatusLabel, approvalStatusTone,
  lessonContentFor, lessonVersion, type InductionLessonRef, type InductionPackDefinition,
  type LessonApprovalStatus,
} from "@/lib/induction-packs";
import {
  useLessonApprovals, useSetLessonApproval, useTenantLessonProgress,
} from "@/hooks/useInductionLessons";

const TONE_CLASSES: Record<"green" | "amber" | "red", string> = {
  green: "bg-success/10 text-success border-success/20",
  amber: "bg-warning/10 text-warning border-warning/20",
  red: "bg-destructive/10 text-destructive border-destructive/20",
};

export function InductionLessonsPanel() {
  const { data: approvals = [], isLoading } = useLessonApprovals();
  const { data: progress = [] } = useTenantLessonProgress();
  const setApproval = useSetLessonApproval();
  const [preview, setPreview] = useState<InductionLessonRef | null>(null);

  const statusFor = (lesson: InductionLessonRef): LessonApprovalStatus => {
    const version = lessonVersion(lesson);
    const row = approvals.find(
      (a) => a.lesson_key === lesson.key && a.lesson_version === version
    );
    return (row?.status as LessonApprovalStatus) ?? "draft";
  };

  const readersFor = (lesson: InductionLessonRef) =>
    new Set(
      progress
        .filter((p) => p.lesson_key === lesson.key && p.completed_at)
        .map((p) => p.employee_id)
    ).size;

  const previewContent = preview ? lessonContentFor(preview) : null;

  if (isLoading) return <div className="h-32 rounded-xl bg-muted/40 animate-pulse" />;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-card p-4 space-y-1">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">Induction lessons on the web</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Staff read these on screen instead of a PDF. Nothing is visible to them until you
          release it. If a lesson is rewritten later, you will be asked to release the new
          version — what people already completed is kept.
        </p>
      </div>

      <Tabs defaultValue={INDUCTION_PACKS[0].role} className="min-w-0 space-y-3">
        <TabsList className="flex w-full flex-nowrap justify-start h-auto">
          {INDUCTION_PACKS.map((pack) => (
            <TabsTrigger key={pack.role} value={pack.role}>
              {PACK_ROLE_LABELS[pack.role]}
            </TabsTrigger>
          ))}
        </TabsList>

        {INDUCTION_PACKS.map((pack) => (
          <TabsContent key={pack.role} value={pack.role} className="space-y-2">
            <PackHeader pack={pack} />
            {pack.lessons.map((lesson) => {
              const status = statusFor(lesson);
              const version = lessonVersion(lesson);
              const readers = readersFor(lesson);
              const hasContent = !!lessonContentFor(lesson);

              return (
                <div
                  key={lesson.key}
                  className="min-w-0 rounded-xl border border-border bg-card p-3.5 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-medium">{lesson.title}</p>
                      <p className="break-words text-xs text-muted-foreground">{lesson.summary}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <Badge variant="outline" className="text-[10px]">v{version}</Badge>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] border", TONE_CLASSES[approvalStatusTone(status)])}
                        >
                          {approvalStatusLabel(status)}
                        </Badge>
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Users className="h-3 w-3" /> {readers} completed
                        </span>
                      </div>
                    </div>
                  </div>

                  {!hasContent && (
                    <p className="flex items-start gap-1.5 text-xs text-destructive">
                      <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      The written lesson is missing, so it cannot be released.
                    </p>
                  )}

                  <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2 sm:flex sm:flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPreview(lesson)}
                      className="w-full sm:w-auto"
                      disabled={!hasContent}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" /> Preview
                    </Button>
                    {status !== "approved" ? (
                      <Button
                        size="sm"
                        className="w-full sm:w-auto"
                        disabled={!hasContent || setApproval.isPending}
                        onClick={() =>
                          setApproval.mutate({
                            lessonKey: lesson.key,
                            lessonVersion: version,
                            status: "approved",
                          })
                        }
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Release to staff
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full sm:w-auto"
                        disabled={setApproval.isPending}
                        onClick={() =>
                          setApproval.mutate({
                            lessonKey: lesson.key,
                            lessonVersion: version,
                            status: "rejected",
                          })
                        }
                      >
                        Hold back
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[calc(100dvh-1rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base pr-6">{preview?.title}</DialogTitle>
          </DialogHeader>
          {previewContent && <LessonViewer lesson={previewContent} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PackHeader({ pack }: { pack: InductionPackDefinition }) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2.5">
      <p className="text-xs font-medium">{pack.name}</p>
      <p className="text-[11px] text-muted-foreground">{pack.description}</p>
      {pack.restricted_to_managers && (
        <p className="text-[11px] text-warning mt-0.5">
          Managers and supervisors only — never sent to ordinary staff.
        </p>
      )}
    </div>
  );
}
