import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, GraduationCap, ArrowRight, ArrowLeft, RotateCcw, Clock, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuizQuestions, type QuizQuestion } from "@/hooks/useTrainingLibrary";
import { useSubmitQuiz, useQuizAttempts } from "@/hooks/useTrainingModules";
import { format, parseISO } from "date-fns";

interface QuizTakerProps {
  moduleId: string;
  assignmentId: string;
  employeeId: string;
  passMark: number;
  retryLimit?: number;
  quizPassed?: boolean;
  onComplete: () => void;
}

export function QuizTaker({ moduleId, assignmentId, employeeId, passMark, retryLimit = 3, quizPassed, onComplete }: QuizTakerProps) {
  const { data: questions = [], isLoading } = useQuizQuestions(moduleId);
  const { data: attempts = [], isLoading: attemptsLoading } = useQuizAttempts(assignmentId);
  const submitQuiz = useSubmitQuiz();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Quiz lock: if already passed, show locked state
  if (quizPassed === true) {
    return (
      <div className="text-center py-8 space-y-3">
        <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <Lock className="h-8 w-8 text-success" />
        </div>
        <h3 className="text-lg font-bold text-success">Quiz Already Passed</h3>
        <p className="text-sm text-muted-foreground">You have already passed this quiz. No further attempts are needed.</p>
        {attempts.length > 0 && (
          <div className="mt-4 space-y-1.5 text-left">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Attempt History</p>
            {attempts.map(att => (
              <div key={att.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs">
                <span>Attempt {att.attempt_number}</span>
                <span className={cn("font-medium", att.passed ? "text-success" : "text-destructive")}>{att.score}%</span>
                <span className="text-muted-foreground">{format(parseISO(att.completed_at), "d MMM yyyy")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (isLoading || attemptsLoading) return <div className="text-center py-6 text-sm text-muted-foreground">Loading quiz…</div>;
  if (questions.length === 0) return (
    <div className="text-center py-8">
      <GraduationCap className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
      <p className="text-sm font-medium text-foreground">No quiz questions available</p>
      <p className="text-xs text-muted-foreground mt-1">Your manager hasn't added questions to this quiz yet.</p>
    </div>
  );

  // Attempt count from DB
  const dbAttemptCount = attempts.length;
  const currentAttemptNumber = dbAttemptCount + 1;
  const attemptsUsed = dbAttemptCount + (submitted ? 1 : 0);
  const attemptsRemaining = retryLimit - attemptsUsed;
  const isLocked = attemptsRemaining <= 0 && !submitted;

  // If locked (max attempts reached, none passed), show locked state
  if (isLocked && !showResults) {
    return (
      <div className="text-center py-8 space-y-3">
        <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <Lock className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-bold text-destructive">No Attempts Remaining</h3>
        <p className="text-sm text-muted-foreground">You have used all {retryLimit} attempts. Please contact your manager.</p>
        {attempts.length > 0 && (
          <div className="mt-4 space-y-1.5 text-left">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Attempt History</p>
            {attempts.map(att => (
              <div key={att.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs">
                <span>Attempt {att.attempt_number}</span>
                <span className={cn("font-medium", att.passed ? "text-success" : "text-destructive")}>{att.score}%</span>
                <span className="text-muted-foreground">{format(parseISO(att.completed_at), "d MMM yyyy")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const totalAnswered = Object.keys(answers).length;
  const progress = Math.round(((currentIndex + 1) / questions.length) * 100);
  const allAnswered = totalAnswered === questions.length;
  const estimatedMinutes = Math.max(1, Math.ceil(questions.length * 0.5));

  const handleAnswer = (questionId: string, optionIndex: number) => {
    if (showResults) return;
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex(i => i + 1);
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
      attemptNumber: currentAttemptNumber,
      answers,
    }, {
      onSuccess: () => {
        if (passed) setTimeout(onComplete, 2000);
      },
    });
  };

  const handleRetry = () => {
    setAnswers({});
    setCurrentIndex(0);
    setShowResults(false);
    setSubmitted(false);
    setShowReview(false);
  };

  // ─── Results View ───
  if (showResults) {
    const correct = questions.filter(q => answers[q.id] === q.correct_option).length;
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= passMark;

    return (
      <div className="space-y-4">
        {/* Score Card */}
        <div className={cn("rounded-xl p-6 text-center border",
          passed ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"
        )}>
          <div className={cn("h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-3",
            passed ? "bg-success/10" : "bg-destructive/10"
          )}>
            {passed ? <CheckCircle2 className="h-8 w-8 text-success" /> : <XCircle className="h-8 w-8 text-destructive" />}
          </div>
          <h3 className={cn("text-xl font-bold", passed ? "text-success" : "text-destructive")}>
            {passed ? "Quiz Passed!" : "Not Passed"}
          </h3>
          <p className="text-3xl font-bold text-foreground mt-1 tabular-nums">{score}%</p>
          <p className="text-sm text-muted-foreground mt-1">
            {correct} of {questions.length} correct · Pass mark: {passMark}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">Attempt {currentAttemptNumber} of {retryLimit}</p>
          {passed && (
            <p className="text-xs text-success mt-2">Your training will be marked as completed.</p>
          )}
        </div>

        {/* Retry Info */}
        {!passed && (
          <div className={cn("rounded-lg p-3 border text-center",
            attemptsRemaining > 0 ? "bg-warning/5 border-warning/10" : "bg-destructive/5 border-destructive/10"
          )}>
            {attemptsRemaining > 0 ? (
              <p className="text-sm text-warning font-medium">
                {attemptsRemaining} attempt{attemptsRemaining !== 1 ? "s" : ""} remaining
              </p>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Lock className="h-4 w-4 text-destructive" />
                <p className="text-sm text-destructive font-medium">No attempts remaining — contact your manager</p>
              </div>
            )}
          </div>
        )}

        {/* Review toggle */}
        <Button variant="outline" onClick={() => setShowReview(!showReview)} className="w-full text-sm">
          {showReview ? "Hide Review" : "Review Answers"}
        </Button>

        {/* Answer review */}
        {showReview && (
          <div className="space-y-2">
            {questions.map((q, i) => {
              const userAnswer = answers[q.id];
              const isCorrect = userAnswer === q.correct_option;
              return (
                <div key={q.id} className={cn("p-3 rounded-lg border", isCorrect ? "border-success/20 bg-success/5" : "border-destructive/20 bg-destructive/5")}>
                  <p className="text-xs font-medium text-foreground">{i + 1}. {q.question}</p>
                  <div className="mt-1.5 space-y-0.5">
                    {(q.options || []).map((opt: string, oi: number) => (
                      <p key={oi} className={cn("text-[11px] pl-2",
                        oi === q.correct_option ? "text-success font-medium" :
                        oi === userAnswer && !isCorrect ? "text-destructive line-through" : "text-muted-foreground"
                      )}>
                        {oi === q.correct_option ? "✓" : oi === userAnswer ? "✗" : "○"} {opt}
                      </p>
                    ))}
                  </div>
                  {q.explanation && (
                    <p className="text-[10px] text-muted-foreground mt-1.5 pl-2 border-l-2 border-primary/20">{q.explanation}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Attempt History */}
        {attempts.length > 0 && (
          <>
            <Button variant="ghost" onClick={() => setShowHistory(!showHistory)} className="w-full text-xs">
              {showHistory ? "Hide History" : `Previous Attempts (${attempts.length})`}
            </Button>
            {showHistory && (
              <div className="space-y-1.5">
                {attempts.map(att => (
                  <div key={att.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs">
                    <span>Attempt {att.attempt_number}</span>
                    <span className={cn("font-medium", att.passed ? "text-success" : "text-destructive")}>{att.score}%</span>
                    <span className="text-muted-foreground">{format(parseISO(att.completed_at), "d MMM yyyy")}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Retry button */}
        {!passed && attemptsRemaining > 0 && (
          <Button onClick={handleRetry} variant="outline" className="w-full gap-2" size="lg">
            <RotateCcw className="h-4 w-4" /> Try Again
          </Button>
        )}
      </div>
    );
  }

  // ─── Question View (one at a time) ───
  const hasAnswered = answers[currentQ.id] !== undefined;

  return (
    <div className="space-y-4">
      {/* Quiz Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">{questions.length} questions</Badge>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />~{estimatedMinutes} min
          </span>
        </div>
        <p className="text-xs font-medium text-foreground tabular-nums">
          {currentIndex + 1} / {questions.length}
        </p>
      </div>

      {dbAttemptCount > 0 && (
        <p className="text-[10px] text-muted-foreground text-center">
          Attempt {currentAttemptNumber} of {retryLimit}
        </p>
      )}

      <Progress value={progress} className="h-1.5" />

      {/* Question dots */}
      <div className="flex gap-1 flex-wrap justify-center">
        {questions.map((q, i) => (
          <button
            key={q.id}
            onClick={() => setCurrentIndex(i)}
            className={cn("h-2.5 w-2.5 rounded-full transition-all",
              i === currentIndex ? "bg-primary scale-125" :
              answers[q.id] !== undefined ? "bg-primary/40" : "bg-muted-foreground/20"
            )}
          />
        ))}
      </div>

      {/* Question Card */}
      <div className="rounded-xl bg-card border border-border p-4 shadow-sm min-h-[180px]">
        <p className="text-sm font-semibold text-foreground mb-4">{currentQ.question}</p>
        <div className="space-y-2">
          {(currentQ.options || []).map((opt: string, oi: number) => {
            const selected = answers[currentQ.id] === oi;
            return (
              <button key={oi}
                onClick={() => handleAnswer(currentQ.id, oi)}
                className={cn(
                  "w-full text-left p-3.5 rounded-lg border text-sm transition-all min-h-[44px]",
                  selected
                    ? "bg-primary/5 border-primary/30 text-foreground font-medium"
                    : "bg-card border-border text-muted-foreground hover:bg-muted/50 active:bg-muted"
                )}
              >
                <span className="mr-2 text-xs font-bold">{String.fromCharCode(65 + oi)}.</span>
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="flex-1 gap-1"
          size="lg"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        {currentIndex < questions.length - 1 ? (
          <Button onClick={handleNext} className="flex-1 gap-1" size="lg"
            disabled={!hasAnswered}>
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} className="flex-1" size="lg"
            disabled={!allAnswered || submitQuiz.isPending}>
            {submitQuiz.isPending ? "Submitting…" : "Submit Quiz"}
          </Button>
        )}
      </div>

      {/* Answered count */}
      <p className="text-center text-[10px] text-muted-foreground">
        {totalAnswered} of {questions.length} answered
        {!allAnswered && " — answer all to submit"}
      </p>
    </div>
  );
}