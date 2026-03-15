import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, GraduationCap, ArrowRight, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuizQuestions, type QuizQuestion } from "@/hooks/useTrainingLibrary";
import { useSubmitQuiz } from "@/hooks/useTrainingModules";

interface QuizTakerProps {
  moduleId: string;
  assignmentId: string;
  employeeId: string;
  passMark: number;
  retryLimit?: number;
  attemptCount?: number;
  onComplete: () => void;
}

export function QuizTaker({ moduleId, assignmentId, employeeId, passMark, retryLimit = 3, attemptCount = 0, onComplete }: QuizTakerProps) {
  const { data: questions = [], isLoading } = useQuizQuestions(moduleId);
  const submitQuiz = useSubmitQuiz();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (isLoading) return <div className="text-center py-6 text-sm text-muted-foreground">Loading quiz…</div>;
  if (questions.length === 0) return <div className="text-center py-6 text-sm text-muted-foreground">No quiz questions available.</div>;

  const currentQ = questions[currentIndex];
  const totalAnswered = Object.keys(answers).length;
  const progress = Math.round((totalAnswered / questions.length) * 100);

  const handleAnswer = (questionId: string, optionIndex: number) => {
    if (showResults) return;
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(i => i - 1);
  };

  const handleSubmit = () => {
    const correct = questions.filter(q => answers[q.id] === q.correct_option).length;
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= passMark;
    setShowResults(true);
    setSubmitted(true);
    submitQuiz.mutate({
      assignmentId,
      employeeId,
      documentId: moduleId,
      score,
      passed,
    }, {
      onSuccess: () => {
        if (passed) setTimeout(onComplete, 1500);
      },
    });
  };

  const handleRetry = () => {
    setAnswers({});
    setCurrentIndex(0);
    setShowResults(false);
    setSubmitted(false);
  };

  // Results view
  if (showResults) {
    const correct = questions.filter(q => answers[q.id] === q.correct_option).length;
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= passMark;

    return (
      <div className="space-y-4">
        <div className={cn("rounded-xl p-6 text-center border",
          passed ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"
        )}>
          <div className={cn("h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-3",
            passed ? "bg-success/10" : "bg-destructive/10"
          )}>
            {passed ? <CheckCircle2 className="h-8 w-8 text-success" /> : <XCircle className="h-8 w-8 text-destructive" />}
          </div>
          <h3 className={cn("text-xl font-bold", passed ? "text-success" : "text-destructive")}>
            {passed ? "Passed!" : "Not Passed"}
          </h3>
          <p className="text-3xl font-bold text-foreground mt-1">{score}%</p>
          <p className="text-sm text-muted-foreground mt-1">
            {correct} of {questions.length} correct · Pass mark: {passMark}%
          </p>
        </div>

        {/* Answer review */}
        <div className="space-y-2">
          {questions.map((q, i) => {
            const userAnswer = answers[q.id];
            const isCorrect = userAnswer === q.correct_option;
            return (
              <div key={q.id} className={cn("p-3 rounded-lg border", isCorrect ? "border-success/20 bg-success/5" : "border-destructive/20 bg-destructive/5")}>
                <p className="text-xs font-medium text-foreground">{i + 1}. {q.question}</p>
                <div className="mt-1 space-y-0.5">
                  {(q.options || []).map((opt: string, oi: number) => (
                    <p key={oi} className={cn("text-[11px] pl-2",
                      oi === q.correct_option ? "text-success font-medium" :
                      oi === userAnswer && !isCorrect ? "text-destructive line-through" : "text-muted-foreground"
                    )}>
                      {oi === q.correct_option ? "✓" : oi === userAnswer ? "✗" : "○"} {opt}
                    </p>
                  ))}
                </div>
                {q.explanation && <p className="text-[10px] text-muted-foreground mt-1.5 pl-2 border-l-2 border-primary/20">{q.explanation}</p>}
              </div>
            );
          })}
        </div>

        {!passed && attemptCount < retryLimit && (
          <Button onClick={handleRetry} variant="outline" className="w-full gap-2">
            <RotateCcw className="h-4 w-4" /> Try Again ({retryLimit - attemptCount - 1} attempts remaining)
          </Button>
        )}
      </div>
    );
  }

  // Question view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Question {currentIndex + 1} of {questions.length}</p>
        <Badge variant="outline" className="text-[10px]">{totalAnswered}/{questions.length} answered</Badge>
      </div>
      <Progress value={progress} className="h-1.5" />

      <div className="rounded-xl bg-card border border-border p-4 shadow-sm">
        <p className="text-sm font-semibold text-foreground mb-4">{currentQ.question}</p>
        <div className="space-y-2">
          {(currentQ.options || []).map((opt: string, oi: number) => {
            const selected = answers[currentQ.id] === oi;
            return (
              <button key={oi}
                onClick={() => handleAnswer(currentQ.id, oi)}
                className={cn(
                  "w-full text-left p-3 rounded-lg border text-sm transition-all",
                  selected
                    ? "bg-primary/5 border-primary/30 text-foreground font-medium"
                    : "bg-card border-border text-muted-foreground hover:bg-muted/50"
                )}
              >
                <span className="mr-2 text-xs">{String.fromCharCode(65 + oi)}.</span>
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2">
        {currentIndex > 0 && (
          <Button variant="outline" onClick={handlePrev} className="flex-1">Previous</Button>
        )}
        {currentIndex < questions.length - 1 ? (
          <Button onClick={handleNext} className="flex-1 gap-1" disabled={!answers[currentQ.id] && answers[currentQ.id] !== 0}>
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} className="flex-1"
            disabled={totalAnswered < questions.length || submitQuiz.isPending}>
            {submitQuiz.isPending ? "Submitting…" : "Submit Quiz"}
          </Button>
        )}
      </div>
    </div>
  );
}
