const QUESTIONS = [
  {
    question: "Are managers spending too much time chasing information?",
    insight:
      "When scheduling, training, compliance and payroll live in separate systems, managers waste hours pulling together a picture that should already be clear.",
  },
  {
    question: "Can you actually see who is ready for next week's rota?",
    insight:
      "Headcount is not readiness. Training status, compliance records and availability need to be connected to the rota — not checked separately.",
  },
  {
    question: "Do overdue documents surface before they become a risk?",
    insight:
      "Expiring right-to-work, missing certifications and overdue training should surface automatically — not when someone remembers to check.",
  },
  {
    question: "Are incidents connected to follow-through, or just recorded?",
    insight:
      "Recording an issue is not the same as resolving it. Without a link to actions, deadlines and accountability, things disappear.",
  },
];

interface ManagerQuestionsProps {
  className?: string;
}

export function ManagerQuestions({ className }: ManagerQuestionsProps) {
  return (
    <div className={className}>
      <div className="space-y-3">
        {QUESTIONS.map((q, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-2.5 hover:border-primary/15 focus-within:ring-2 focus-within:ring-ring transition-all duration-200"
            tabIndex={0}
          >
            <p className="text-[13px] sm:text-[15px] font-semibold text-foreground leading-snug">
              {q.question}
            </p>
            <p className="text-[12px] sm:text-[13px] text-muted-foreground leading-relaxed">
              {q.insight}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
