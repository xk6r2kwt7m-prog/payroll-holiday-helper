import { Building2, Layers, Zap } from "lucide-react";

interface SectionProps {
  className?: string;
}

/* ── "Why different" differentiation blocks ── */

const DIFF_BLOCKS = [
  {
    icon: Building2,
    title: "Hospitality-first workflows",
    desc: "Built around shifts, service pressure, sites, standards and operational accountability.",
  },
  {
    icon: Layers,
    title: "Connected control",
    desc: "Scheduling, payroll, training, compliance and operational signals sit inside one connected platform instead of five disconnected places.",
  },
  {
    icon: Zap,
    title: "Follow-through, not just filing",
    desc: "UGLŌ helps managers see what still needs action, not just what has already been recorded.",
  },
];

export function EmployerConversion({ className }: SectionProps) {
  return (
    <div className={className}>
      <div className="space-y-4">
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            Generic HR software helps store employee information.
          </p>
          <p>
            Rota tools help schedule shifts.
          </p>
          <p>
            Payroll tools help process pay.
          </p>
          <p>
            But hospitality management is not only about storing records or producing a payslip. It is about keeping people ready, standards visible and follow-through consistent under real service pressure.
          </p>
          <p>
            UGLŌ is different because it is built around hospitality execution.
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
  "Stronger accountability for overdue actions and follow-up",
  "Clearer visibility over staff readiness and operational gaps",
  "Better labour control through tighter planning and execution discipline",
  "Fewer avoidable failures caused by missed training, missing documents or weak follow-through",
  "Less management waste from checking, chasing and reconciling across multiple systems",
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
