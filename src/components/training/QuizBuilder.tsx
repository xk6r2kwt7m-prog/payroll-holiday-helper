import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, GraduationCap, GripVertical, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuizQuestions } from "@/hooks/useTrainingLibrary";
import { useCreateQuizQuestion, useDeleteQuizQuestion } from "@/hooks/useTrainingModules";

interface QuizBuilderProps {
  moduleId: string;
  canEdit: boolean;
}

export function QuizBuilder({ moduleId, canEdit }: QuizBuilderProps) {
  const { data: questions = [], isLoading } = useQuizQuestions(moduleId);
  const createQuestion = useCreateQuizQuestion();
  const deleteQuestion = useDeleteQuizQuestion();

  if (isLoading) return <div className="text-center py-6 text-sm text-muted-foreground">Loading quiz…</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{questions.length} Question{questions.length !== 1 ? "s" : ""}</p>
        {canEdit && <AddQuestionDialog moduleId={moduleId} nextOrder={questions.length + 1} />}
      </div>

      {questions.length === 0 && (
        <div className="text-center py-8">
          <GraduationCap className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No quiz questions yet</p>
          {canEdit && <p className="text-xs text-muted-foreground mt-1">Add questions to enable the knowledge check.</p>}
        </div>
      )}

      <div className="space-y-2">
        {questions.map((q, i) => (
          <div key={q.id} className="p-3 rounded-lg bg-card border border-border">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-foreground flex-1">{i + 1}. {q.question}</p>
              {canEdit && (
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => deleteQuestion.mutate(q.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <div className="mt-2 space-y-1">
              {(q.options || []).map((opt: string, oi: number) => (
                <div key={oi} className={cn("flex items-center gap-1.5 text-xs pl-2",
                  oi === q.correct_option ? "text-success font-medium" : "text-muted-foreground"
                )}>
                  {oi === q.correct_option ? <CheckCircle2 className="h-3 w-3 shrink-0" /> : <span className="w-3 h-3 rounded-full border border-current shrink-0" />}
                  {opt}
                </div>
              ))}
            </div>
            {q.explanation && (
              <p className="text-[11px] text-muted-foreground mt-2 pl-2 border-l-2 border-primary/20">{q.explanation}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AddQuestionDialog({ moduleId, nextOrder }: { moduleId: string; nextOrder: number }) {
  const [open, setOpen] = useState(false);
  const createQuestion = useCreateQuizQuestion();
  const [form, setForm] = useState({
    question: "",
    options: ["", "", "", ""],
    correct_option: 0,
    explanation: "",
    question_type: "multiple_choice",
  });

  const updateOption = (index: number, value: string) => {
    const opts = [...form.options];
    opts[index] = value;
    setForm(f => ({ ...f, options: opts }));
  };

  const handleSubmit = () => {
    if (!form.question.trim() || form.options.filter(o => o.trim()).length < 2) return;
    const validOptions = form.options.filter(o => o.trim());
    createQuestion.mutate({
      document_id: moduleId,
      question: form.question,
      question_type: form.question_type,
      options: validOptions,
      correct_option: Math.min(form.correct_option, validOptions.length - 1),
      explanation: form.explanation || undefined,
      display_order: nextOrder,
    }, {
      onSuccess: () => {
        setOpen(false);
        setForm({ question: "", options: ["", "", "", ""], correct_option: 0, explanation: "", question_type: "multiple_choice" });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5"><Plus className="h-4 w-4" /> Add Question</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add Quiz Question</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div><Label>Question</Label><Textarea value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} rows={2} placeholder="e.g. How many major allergens must be declared?" /></div>

          <div className="space-y-2">
            <Label>Options (min 2)</Label>
            {form.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, correct_option: i }))}
                  className={cn("h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors",
                    i === form.correct_option ? "border-success bg-success/10" : "border-muted-foreground/30"
                  )}>
                  {i === form.correct_option && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                </button>
                <Input
                  value={opt}
                  onChange={e => updateOption(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  className="h-8"
                />
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground">Click the circle to mark the correct answer.</p>
          </div>

          <div><Label>Explanation (optional)</Label><Textarea value={form.explanation} onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))} rows={2} placeholder="Shown after answering" /></div>

          <Button onClick={handleSubmit} disabled={createQuestion.isPending} className="w-full">
            {createQuestion.isPending ? "Adding..." : "Add Question"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
