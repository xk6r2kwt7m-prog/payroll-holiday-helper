import { useMemo, useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Wand2, Check, X, PenLine, BookOpen, ChevronDown, ChevronRight, Plus, Loader2,
} from "lucide-react";
import {
  useReaderSections, useReaderQuestions, useBuildReaderVersion,
  useSaveReaderQuestion, useAddReaderQuestion, useSetReaderEnabled,
} from "@/hooks/useDocumentReader";
import {
  approvedQuestions, estimatedMinutes, questionsForSection,
  readerStatusLabel, readerStatusTone,
} from "@/lib/document-reader";
import { cn } from "@/lib/utils";

const toneClass: Record<string, string> = {
  red: "bg-destructive/10 text-destructive",
  amber: "bg-warning/10 text-warning",
  green: "bg-success/10 text-success",
  grey: "bg-muted text-muted-foreground",
};

/**
 * Manager view of the on-screen reading version of one document.
 * The uploaded file itself is never changed — this only controls the readable
 * copy staff see, and which questions are approved for them.
 */
export function DocumentReaderSheet({
  doc,
  onClose,
}: {
  doc: any | null;
  onClose: () => void;
}) {
  const documentId = doc?.id as string | undefined;
  const { data: sections = [], isLoading: loadingSections } = useReaderSections(documentId);
  const { data: questions = [] } = useReaderQuestions(documentId);
  const build = useBuildReaderVersion();
  const saveQuestion = useSaveReaderQuestion();
  const addQuestion = useAddReaderQuestion();
  const setEnabled = useSetReaderEnabled();

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<any | null>(null);
  const [addingFor, setAddingFor] = useState<string | null>(null);

  const approvedCount = useMemo(() => approvedQuestions(questions).length, [questions]);
  const suggestedCount = useMemo(
    () => questions.filter((q) => q.approval_status === "suggested").length,
    [questions],
  );

  if (!doc) return null;
  const building = build.isPending || doc.reader_status === "building";

  return (
    <Sheet open={!!doc} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[92vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="text-base leading-snug pr-6">
            On-screen version — {doc.name}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-2 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn("text-[10px]", toneClass[readerStatusTone(doc.reader_status)])}
            >
              {readerStatusLabel(doc.reader_status, sections.length)}
            </Badge>
            {sections.length > 0 && (
              <Badge variant="outline" className="text-[10px]">
                About {estimatedMinutes(sections)} min to read
              </Badge>
            )}
            {approvedCount > 0 && (
              <Badge variant="outline" className="text-[10px]">
                {approvedCount} question{approvedCount === 1 ? "" : "s"} live
              </Badge>
            )}
            {suggestedCount > 0 && (
              <Badge variant="outline" className={cn("text-[10px]", toneClass.amber)}>
                {suggestedCount} waiting for your approval
              </Badge>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Staff read this on their phone instead of scrolling a PDF. The original file stays
            available and is never changed. Questions are only shown to staff once you approve them.
          </p>

          {doc.reader_error && (
            <p className="rounded-lg bg-destructive/10 text-destructive text-xs p-2.5">
              {doc.reader_error}
            </p>
          )}

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="pr-3">
              <Label className="text-sm">Show the on-screen version to staff</Label>
              <p className="text-xs text-muted-foreground">
                Turn this off to send them back to the original file only.
              </p>
            </div>
            <Switch
              checked={doc.reader_enabled !== false}
              onCheckedChange={async (v) => {
                await setEnabled.mutateAsync({ documentId: doc.id, enabled: v });
                toast.success(v ? "Staff will see the on-screen version" : "Staff will see the file only");
              }}
            />
          </div>

          <Button
            className="w-full"
            disabled={building}
            onClick={async () => {
              try {
                const res = await build.mutateAsync({ documentId: doc.id });
                toast.success(
                  `Prepared ${res.sections} sections and drafted ${res.suggested_questions} questions for you to approve`,
                );
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          >
            {building
              ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Preparing…</>
              : <><Wand2 className="h-4 w-4 mr-1.5" /> {sections.length ? "Prepare again from the file" : "Prepare the on-screen version"}</>}
          </Button>
          {sections.length > 0 && (
            <p className="text-[11px] text-muted-foreground -mt-2">
              Preparing again rebuilds the sections from the current file and drafts fresh questions.
              Anything staff have already completed keeps the version they completed.
            </p>
          )}

          {loadingSections ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : sections.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-center">
              <BookOpen className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No on-screen version yet. Prepare one and staff can read it section by section.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sections.map((section, i) => {
                const isOpen = !!openSections[section.id];
                const sectionQuestions = questions.filter((q) => q.section_id === section.id);
                const live = questionsForSection(questions, section.id).length;
                return (
                  <div key={section.id} className="rounded-lg border">
                    <button
                      type="button"
                      className="w-full flex items-start gap-2 p-3 text-left"
                      onClick={() => setOpenSections((s) => ({ ...s, [section.id]: !isOpen }))}
                    >
                      {isOpen
                        ? <ChevronDown className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                        : <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />}
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium leading-snug">
                          {i + 1}. {section.heading}
                        </span>
                        <span className="block text-[11px] text-muted-foreground mt-0.5">
                          {live > 0 ? `${live} question${live === 1 ? "" : "s"} for staff` : "No question yet"}
                        </span>
                      </span>
                    </button>

                    {isOpen && (
                      <div className="px-3 pb-3 space-y-3">
                        <p className="text-xs whitespace-pre-wrap text-muted-foreground max-h-48 overflow-y-auto rounded-md bg-muted/40 p-2.5">
                          {section.body}
                        </p>

                        {sectionQuestions.map((q) => (
                          <div key={q.id} className="rounded-md border p-2.5 space-y-2">
                            <p className="text-sm">{q.question}</p>
                            <ul className="space-y-0.5">
                              {q.options.map((opt, idx) => (
                                <li
                                  key={idx}
                                  className={cn(
                                    "text-xs",
                                    idx === q.correct_index
                                      ? "text-success font-medium"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  {idx === q.correct_index ? "✓ " : "• "}{opt}
                                </li>
                              ))}
                            </ul>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px]",
                                  q.approval_status === "approved" ? toneClass.green
                                    : q.approval_status === "rejected" ? toneClass.grey
                                      : toneClass.amber,
                                )}
                              >
                                {q.approval_status === "approved" ? "Live for staff"
                                  : q.approval_status === "rejected" ? "Not used"
                                    : "Draft — needs your approval"}
                              </Badge>
                              {q.approval_status !== "approved" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    await saveQuestion.mutateAsync({
                                      id: q.id, documentId: doc.id, updates: {},
                                      event: "reader_question_approved",
                                    });
                                    toast.success("Approved — staff will now be asked this");
                                  }}
                                >
                                  <Check className="h-3.5 w-3.5 mr-1" /> Approve
                                </Button>
                              )}
                              {q.approval_status !== "rejected" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={async () => {
                                    await saveQuestion.mutateAsync({
                                      id: q.id, documentId: doc.id, updates: {},
                                      event: "reader_question_rejected",
                                    });
                                    toast.success("Not used — staff will not see it");
                                  }}
                                >
                                  <X className="h-3.5 w-3.5 mr-1" /> Don't use
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" onClick={() => setEditing({ ...q })}>
                                <PenLine className="h-3.5 w-3.5 mr-1" /> Edit
                              </Button>
                            </div>
                          </div>
                        ))}

                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => setAddingFor(section.id)}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" /> Write my own question
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <QuestionEditor
          value={editing}
          onClose={() => setEditing(null)}
          onSave={async (v) => {
            await saveQuestion.mutateAsync({
              id: v.id,
              documentId: doc.id,
              updates: {
                question: v.question,
                options: v.options,
                correct_index: v.correct_index,
                explanation: v.explanation || null,
              },
              event: "reader_question_edited",
            });
            setEditing(null);
            toast.success("Saved");
          }}
        />

        <QuestionEditor
          value={addingFor ? { question: "", options: ["", ""], correct_index: 0, explanation: "" } : null}
          onClose={() => setAddingFor(null)}
          onSave={async (v) => {
            await addQuestion.mutateAsync({
              documentId: doc.id,
              sectionId: addingFor!,
              question: v.question,
              options: v.options,
              correctIndex: v.correct_index,
              explanation: v.explanation,
            });
            setAddingFor(null);
            toast.success("Added — staff will be asked this");
          }}
        />
      </SheetContent>
    </Sheet>
  );
}

/** Small editor used both for correcting a draft question and writing a new one. */
function QuestionEditor({
  value,
  onClose,
  onSave,
}: {
  value: any | null;
  onClose: () => void;
  onSave: (v: any) => Promise<void>;
}) {
  const [state, setState] = useState<any | null>(null);
  const current = state ?? value;
  if (!value || !current) return null;

  const update = (patch: any) => setState({ ...current, ...patch });
  const setOption = (i: number, text: string) => {
    const options = [...current.options];
    options[i] = text;
    update({ options });
  };

  const valid =
    current.question.trim().length > 3 &&
    current.options.filter((o: string) => o.trim()).length >= 2 &&
    current.correct_index < current.options.length;

  return (
    <Sheet open onOpenChange={(v) => { if (!v) { setState(null); onClose(); } }}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="text-base">Question</SheetTitle>
        </SheetHeader>
        <div className="mt-2 space-y-3">
          <div>
            <Label className="text-xs">What should staff be asked?</Label>
            <Textarea
              value={current.question}
              onChange={(e) => update({ question: e.target.value })}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Answers — tap the circle to mark the right one</Label>
            {current.options.map((opt: string, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`Mark answer ${i + 1} as correct`}
                  onClick={() => update({ correct_index: i })}
                  className={cn(
                    "h-5 w-5 rounded-full border shrink-0",
                    current.correct_index === i ? "bg-success border-success" : "bg-background",
                  )}
                />
                <Input value={opt} onChange={(e) => setOption(i, e.target.value)} />
              </div>
            ))}
            {current.options.length < 5 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => update({ options: [...current.options, ""] })}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add an answer
              </Button>
            )}
          </div>
          <div>
            <Label className="text-xs">Explanation shown if they pick the wrong answer (optional)</Label>
            <Textarea
              value={current.explanation ?? ""}
              onChange={(e) => update({ explanation: e.target.value })}
              rows={2}
            />
          </div>
          <Button
            className="w-full"
            disabled={!valid}
            onClick={async () => {
              await onSave({
                ...current,
                options: current.options.map((o: string) => o.trim()).filter(Boolean),
              });
              setState(null);
            }}
          >
            Save
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
