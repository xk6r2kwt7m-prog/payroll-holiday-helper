import { Building2, Layers, Zap } from "lucide-react";

interface SectionProps {
  className?: string;
}

/* ── "Why this is different" differentiation blocks ── */

const DIFF_BLOCKS = [
  {
    icon: Building2,
    title: "Hospitality-first workflows",
    desc: "Built around shifts, sites, service pressure and operational standards rather than office-based HR processes.",
  },
  {
    icon: Layers,
    title: "Connected operational control",
    desc: "Scheduling, payroll, training, compliance and operational signals are connected inside one platform instead of split across separate systems.",
  },
  {
    icon: Zap,
    title: "Execution, not just administration",
    desc: "UGLŌ helps managers follow through on tasks, standards and readiness instead of only storing employee data.",
  },
];

export function EmployerConversion({ className }: SectionProps) {
  return (
    <div className={className}>
      <div className="space-y-4">
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            Generic HR systems are built to manage employee records. Some rota tools help schedule shifts. Some payroll tools help process pay.
          </p>
          <p>
            Hospitality operators need more than that.
          </p>
          <p>
            UGLŌ connects workforce management with training, compliance and operational execution so managers can see not only who is working, but who is ready, what is overdue, where standards are slipping and what needs follow-up next.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 mt-6">
          {DIFF_BLOCKS.map((b) => (
            <div
              key={b.title}
              className="flex gap-3.5 rounded-xl border border-border bg-card p-4"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 mt-0.5">
                <b.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-foreground">{b.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Business outcomes section ── */

const OUTCOMES = [
  "Less fragmentation across workforce, training, compliance and operations",
  "Stronger accountability for overdue tasks and follow-up",
  "Clearer visibility over staff readiness and operational gaps",
  "Tighter labour control through better planning and execution discipline",
  "Fewer avoidable failures caused by missed training, poor follow-through or weak compliance visibility",
  "Less management waste from chasing information across multiple tools",
];

export function CandidateConversion({ className }: SectionProps) {
  return (
    <div className={className}>
      <ul className="space-y-3">
        {OUTCOMES.map((o) => (
          <li key={o} className="flex items-start gap-2.5 text-sm text-foreground">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            <span>{o}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
