import { useState } from "react";

const TRANSFORMATIONS = [
  {
    from: "Chasing information across systems",
    to: "Seeing what matters in one view",
    detail: "No more switching between rota tools, HR systems, training trackers and spreadsheets to get a clear operational picture.",
  },
  {
    from: "Reacting to problems after they hit service",
    to: "Acting on signals before they reach the floor",
    detail: "Overdue training, expiring documents and staffing gaps surface automatically — not when a manager remembers to check.",
  },
  {
    from: "Managing headcount without knowing readiness",
    to: "Managing readiness alongside the rota",
    detail: "Know who is trained, compliant and genuinely ready — not just who is available on the schedule.",
  },
  {
    from: "Recording issues with no follow-through",
    to: "Connecting incidents to actions and accountability",
    detail: "Every issue links to a follow-up, a deadline and an owner — so nothing disappears into a log.",
  },
];

interface TransformationSectionProps {
  className?: string;
}

export function TransformationSection({ className }: TransformationSectionProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <div className={className}>
      <div className="space-y-3">
        {TRANSFORMATIONS.map((item, i) => {
          const isActive = activeIndex === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIndex(isActive ? null : i)}
              className={`group w-full text-left rounded-xl border overflow-hidden transition-all duration-300 ${
                isActive
                  ? "border-primary/30 shadow-md"
                  : "border-border hover:border-primary/15"
              }`}
            >
              <div className="flex flex-col sm:flex-row">
                {/* From state */}
                <div className={`flex-1 p-4 sm:p-5 transition-all duration-300 ${
                  isActive ? "bg-muted/40" : "bg-card"
                }`}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1.5">Before</p>
                  <p className={`text-sm leading-snug transition-colors duration-300 ${
                    isActive ? "text-muted-foreground/50 line-through" : "text-muted-foreground"
                  }`}>
                    {item.from}
                  </p>
                </div>

                {/* Divider */}
                <div className={`hidden sm:flex items-center justify-center w-10 transition-colors duration-300 ${
                  isActive ? "bg-primary/[0.06]" : "bg-muted/20"
                }`}>
                  <span className={`text-sm font-medium transition-colors duration-300 ${
                    isActive ? "text-primary" : "text-muted-foreground/30"
                  }`}>→</span>
                </div>
                <div className="sm:hidden h-px bg-border" />

                {/* To state */}
                <div className={`flex-1 p-4 sm:p-5 transition-all duration-300 ${
                  isActive ? "bg-primary/[0.04]" : "bg-card"
                }`}>
                  <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1.5 transition-colors duration-300 ${
                    isActive ? "text-primary/60" : "text-muted-foreground/50"
                  }`}>After</p>
                  <p className={`text-sm font-semibold leading-snug transition-colors duration-300 ${
                    isActive ? "text-primary" : "text-foreground"
                  }`}>
                    {item.to}
                  </p>
                </div>
              </div>

              {/* Expandable detail */}
              <div className={`overflow-hidden transition-all duration-300 ${
                isActive ? "max-h-28 opacity-100" : "max-h-0 opacity-0"
              }`}>
                <div className="px-4 sm:px-5 pb-4 pt-1 border-t border-primary/10">
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    {item.detail}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
