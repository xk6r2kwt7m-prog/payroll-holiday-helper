import {
  CalendarDays, Banknote, GraduationCap, ShieldCheck, Activity, SlidersHorizontal,
} from "lucide-react";

const CAPABILITIES = [
  {
    icon: CalendarDays,
    title: "Workforce and scheduling",
    desc: "Plan rotas, manage staffing visibility and keep labour aligned to operational reality.",
  },
  {
    icon: Banknote,
    title: "Payroll and people administration",
    desc: "Run payroll workflows and core people administration without losing sight of what is happening operationally.",
  },
  {
    icon: GraduationCap,
    title: "Training and readiness",
    desc: "Track training, sign-off and completion so staff are prepared for the work they are scheduled to do.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance and governance",
    desc: "Manage documents, expiry dates, onboarding and compliance follow-through with clearer accountability.",
  },
  {
    icon: Activity,
    title: "Operational intelligence",
    desc: "Connect standards, signals and effectiveness logic so managers can see where issues are building.",
  },
  {
    icon: SlidersHorizontal,
    title: "Manager control",
    desc: "See what is overdue, incomplete, weak or unresolved without pulling the picture together manually.",
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
