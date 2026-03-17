const TRANSFORMATIONS = [
  {
    from: "Chasing information across systems",
    to: "Seeing what matters in one view",
    detail: "No more switching between rota tools, HR systems, training trackers and spreadsheets.",
  },
  {
    from: "Reacting after problems hit service",
    to: "Acting on signals before they reach the floor",
    detail: "Overdue training, expiring documents and staffing gaps surface automatically.",
  },
  {
    from: "Managing headcount without knowing readiness",
    to: "Managing readiness alongside the rota",
    detail: "Know who is trained, compliant and genuinely ready — not just who is listed.",
  },
  {
    from: "Recording issues with no follow-through",
    to: "Connecting incidents to actions and accountability",
    detail: "Every issue links to a follow-up, a deadline and an owner.",
  },
];

interface TransformationSectionProps {
  className?: string;
}

export function TransformationSection({ className }: TransformationSectionProps) {
  return (
    <div className={className}>
      <div className="space-y-3">
        {TRANSFORMATIONS.map((item, i) => (
          <div
            key={i}
            className="group rounded-xl border border-border overflow-hidden hover:border-primary/20 focus-within:ring-2 focus-within:ring-ring transition-all duration-300"
            tabIndex={0}
          >
            <div className="flex flex-col sm:flex-row">
              {/* Before */}
              <div className="flex-1 p-4 sm:p-5 bg-muted/30 group-hover:bg-muted/40 transition-colors duration-300">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1.5">Before</p>
                <p className="text-[13px] sm:text-sm text-muted-foreground leading-snug group-hover:text-muted-foreground/50 group-hover:line-through transition-all duration-300">
                  {item.from}
                </p>
              </div>

              {/* Arrow divider */}
              <div className="hidden sm:flex items-center justify-center w-10 bg-muted/15 group-hover:bg-primary/[0.06] transition-colors duration-300">
                <span className="text-sm text-muted-foreground/30 group-hover:text-primary/70 transition-colors duration-300">→</span>
              </div>
              <div className="sm:hidden h-px bg-border" />

              {/* After */}
              <div className="flex-1 p-4 sm:p-5 bg-card group-hover:bg-primary/[0.03] transition-colors duration-300">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 group-hover:text-primary/60 mb-1.5 transition-colors duration-300">After</p>
                <p className="text-[13px] sm:text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors duration-300">
                  {item.to}
                </p>
                <p className="text-[12px] text-muted-foreground/60 leading-relaxed mt-2">
                  {item.detail}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
