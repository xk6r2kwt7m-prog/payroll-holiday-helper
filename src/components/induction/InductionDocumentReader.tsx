import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { toast } from "sonner";
import {
  canConfirmDocument, estimatedMinutes, outstandingSummary, readingProgressPercent,
  type ReaderQuestion, type ReaderSection, type SectionProgress,
} from "@/lib/document-reader";
import { cn } from "@/lib/utils";

export interface ReaderPayload {
  sections: ReaderSection[];
  questions: ReaderQuestion[];
  progress: (SectionProgress & { attempts?: number })[];
}

/**
 * Staff read a document on screen, one section at a time, answering a short
 * check where the manager has approved one. The original file stays available;
 * this is a readable copy of the same wording.
 */
export function InductionDocumentReader({
  reader,
  itemId,
  onAnswer,
  onRead,
  disabled,
}: {
  reader: ReaderPayload;
  itemId: string;
  onRead: (sectionId: string) => Promise<void>;
  onAnswer: (questionId: string, answerIndex: number) => Promise<{ correct: boolean; explanation: string | null }>;
  disabled?: boolean;
}) {
  const { sections, questions, progress } = reader;
  const [index, setIndex] = useState(() => {
    const next = sections.findIndex((s) => {
      const p = progress.find((x) => x.section_id === s.id);
      if (!p?.read) return true;
      const checks = questions.filter((q) => q.section_id === s.id);
      return checks.length > 0 && p.answered_correctly !== true;
    });
    return next === -1 ? 0 : next;
  });
  const [choice, setChoice] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; explanation: string | null } | null>(null);
  const [busy, setBusy] = useState(false);

  const section = sections[index];
  const sectionQuestions = useMemo(
    () => questions.filter((q) => q.section_id === section?.id),
    [questions, section?.id],
  );
  const sectionProgress = progress.find((p) => p.section_id === section?.id);
  const percent = readingProgressPercent(sections, progress);
  const outstanding = outstandingSummary(sections, questions, progress);
  const finished = canConfirmDocument(sections, questions, progress);

  if (!section) return null;

  const markRead = async () => {
    if (sectionProgress?.read) return;
    setBusy(true);
    try { await onRead(section.id); } finally { setBusy(false); }
  };

  const submitAnswer = async () => {
    if (choice === null) return;
    setBusy(true);
    try {
      const res = await onAnswer(sectionQuestions[0].id, choice);
      setFeedback(res);
      if (res.correct) toast.success("That's right");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const goTo = (i: number) => {
    setIndex(Math.max(0, Math.min(sections.length - 1, i)));
    setChoice(null);
    setFeedback(null);
  };

  const questionAnswered = sectionProgress?.answered_correctly === true || feedback?.correct === true;
  const needsAnswer = sectionQuestions.length > 0 && !questionAnswered;

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium inline-flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
            Read on screen
          </p>
          <Badge variant="outline" className="text-[10px]">
            About {estimatedMinutes(sections)} min
          </Badge>
        </div>
        <Progress value={percent} className="h-1.5" />
        <p className="text-[11px] text-muted-foreground">
          Section {index + 1} of {sections.length}
          {outstanding ? ` · ${outstanding}` : finished ? " · All done" : ""}
        </p>
      </div>

      <div className="p-3 space-y-3">
        <h4 className="text-sm font-semibold leading-snug">{section.heading}</h4>
        <div className="text-sm leading-relaxed whitespace-pre-wrap max-h-[45vh] overflow-y-auto">
          {section.body}
        </div>

        {!sectionProgress?.read ? (
          <Button
            size="sm"
            className="w-full min-h-[44px]"
            disabled={busy || disabled}
            onClick={markRead}
          >
            {busy ? "Saving…" : "I have read this section"}
          </Button>
        ) : needsAnswer ? (
          <div className="rounded-lg bg-muted/40 p-3 space-y-2">
            <p className="text-sm font-medium">{sectionQuestions[0].question}</p>
            <div className="space-y-1.5">
              {sectionQuestions[0].options.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setChoice(i); setFeedback(null); }}
                  className={cn(
                    "w-full text-left text-sm rounded-lg border p-2.5 min-h-[44px]",
                    choice === i ? "border-primary bg-primary/5" : "border-border bg-background",
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
            {feedback && !feedback.correct && (
              <p className="text-xs text-destructive">
                Not quite — have another look at this section.
                {feedback.explanation ? ` ${feedback.explanation}` : ""}
              </p>
            )}
            <Button
              size="sm"
              className="w-full min-h-[44px]"
              disabled={choice === null || busy || disabled}
              onClick={submitAnswer}
            >
              {busy ? "Checking…" : "Check my answer"}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-success inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Section complete
          </p>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <Button
            size="sm"
            variant="ghost"
            disabled={index === 0}
            onClick={() => goTo(index - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={index >= sections.length - 1}
            onClick={() => goTo(index + 1)}
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
