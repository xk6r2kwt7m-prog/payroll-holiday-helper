import { useState } from "react";
import { ChevronDown } from "lucide-react";

const QUESTIONS = [
  {
    question: "Are managers spending too much time chasing information?",
    answer:
      "When scheduling, training, compliance and payroll live in separate systems, managers waste hours pulling together a picture that should already be clear. UGLŌ connects the data so the picture is always there.",
  },
  {
    question: "Can you actually see who is ready for next week's rota?",
    answer:
      "Headcount is not readiness. UGLŌ links training status, compliance records and availability to the rota — so you know who is genuinely ready to work, not just who is listed.",
  },
  {
    question: "Do overdue documents surface before they become a risk?",
    answer:
      "Expiring right-to-work, missing certifications and overdue training should surface automatically — not when someone remembers to check. UGLŌ tracks expiry and flags risk before it reaches the floor.",
  },
  {
    question: "Are incidents connected to follow-through, or just recorded?",
    answer:
      "Recording an issue is not the same as resolving it. UGLŌ connects incidents to actions, deadlines and accountability — so nothing disappears into a spreadsheet.",
  },
];

interface ManagerQuestionsProps {
  className?: string;
}

export function ManagerQuestions({ className }: ManagerQuestionsProps) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className={className}>
      <div className="space-y-3">
        {QUESTIONS.map((q, i) => {
          const isOpen = expanded === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setExpanded(isOpen ? null : i)}
              className={`group w-full text-left rounded-xl border p-4 sm:p-5 transition-all duration-300 ${
                isOpen
                  ? "border-primary/25 bg-primary/[0.03] shadow-sm"
                  : "border-border bg-card hover:border-primary/15"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p
                  className={`text-sm sm:text-[15px] font-semibold leading-snug transition-colors duration-200 ${
                    isOpen ? "text-primary" : "text-foreground group-hover:text-primary/80"
                  }`}
                >
                  {q.question}
                </p>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 mt-0.5 text-muted-foreground transition-transform duration-300 ${
                    isOpen ? "rotate-180 text-primary" : ""
                  }`}
                />
              </div>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  isOpen ? "max-h-40 opacity-100 mt-3" : "max-h-0 opacity-0"
                }`}
              >
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  {q.answer}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
