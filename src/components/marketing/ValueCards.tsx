import {
  CalendarDays, Banknote, GraduationCap, ShieldCheck, Activity, SlidersHorizontal,
} from "lucide-react";

const CAPABILITIES = [
  {
    icon: CalendarDays,
    title: "Workforce and scheduling",
    desc: "Plan rotas, manage employee records, track attendance visibility and keep staffing aligned to operational reality.",
  },
  {
    icon: Banknote,
    title: "Payroll and people administration",
    desc: "Run payroll workflows and core people administration with clearer links to how the operation is actually being managed.",
  },
  {
    icon: GraduationCap,
    title: "Training and readiness",
    desc: "Assign training, track completion, manage sign-off and make sure staff are prepared for the work they are scheduled to do.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance and governance",
    desc: "Track onboarding, right-to-work documents, expiry dates, compliance actions and accountability across the workforce.",
  },
  {
    icon: Activity,
    title: "Operational intelligence",
    desc: "Use evidence, signal mapping, effectiveness logic and quality controls to understand where standards are holding and where issues are building.",
  },
  {
    icon: SlidersHorizontal,
    title: "Manager control",
    desc: "See what is overdue, what is weak, what is incomplete and what needs action next, without stitching the picture together manually.",
  },
];

interface ValueCardsProps {
  className?: string;
}

export function ValueCards({ className }: ValueCardsProps) {
  return (
    <div className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CAPABILITIES.map((v) => (
          <div
            key={v.title}
            className="rounded-xl border border-border bg-card p-5 space-y-2.5"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <v.icon className="h-[18px] w-[18px] text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">{v.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{v.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
