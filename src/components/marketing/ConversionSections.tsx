import { Building2, Layers, Zap } from "lucide-react";

interface SectionProps {
  className?: string;
}

const DIFF_BLOCKS = [
  {
    icon: Building2,
    title: "Hospitality-first workflows",
    desc: "Built around shifts, sites and service pressure — not office HR processes.",
  },
  {
    icon: Layers,
    title: "Connected control",
    desc: "Scheduling, payroll, training, compliance and signals in one platform — not five disconnected tools.",
  },
  {
    icon: Zap,
    title: "Follow-through, not filing",
    desc: "See what still needs action — not just what has been recorded.",
  },
];

export function EmployerConversion({ className }: SectionProps) {
  return (
    <div className={className}>
      <div className="space-y-5">
        <div className="text-[13px] sm:text-sm text-muted-foreground leading-relaxed">
          <p>Generic HR stores records. Rota tools schedule shifts. Payroll tools process pay.</p>
          <p className="text-foreground font-semibold mt-2">Hospitality operators need more than that.</p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {DIFF_BLOCKS.map((b) => (
            <div
              key={b.title}
              className="group flex gap-3.5 rounded-xl border border-border bg-card p-4 hover:border-primary/25 hover:shadow-sm focus-within:ring-2 focus-within:ring-ring transition-all duration-200"
              tabIndex={0}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08] group-hover:bg-primary/[0.12] transition-colors duration-200 mt-0.5">
                <b.icon className="h-4 w-4 text-primary/70 group-hover:text-primary transition-colors duration-200" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-foreground tracking-tight">{b.title}</h4>
                <p className="text-[12px] sm:text-[13px] text-muted-foreground leading-relaxed mt-1">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Business outcomes ── */

const OUTCOMES = [
  "Less fragmentation across workforce, training, compliance and operations",
  "Stronger accountability for overdue actions and follow-up",
  "Clearer visibility over staff readiness and operational gaps",
  "Tighter labour control through better planning and execution",
  "Fewer avoidable failures from missed training or weak compliance visibility",
  "Less management time wasted chasing information across multiple systems",
];

export function CandidateConversion({ className }: SectionProps) {
  return (
    <div className={className}>
      <ul className="space-y-2.5">
        {OUTCOMES.map((o) => (
          <li key={o} className="flex items-start gap-2.5 text-sm text-foreground">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            <span>{o}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
