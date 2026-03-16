import {
  CalendarDays, Banknote, GraduationCap, ShieldCheck, Activity, SlidersHorizontal,
} from "lucide-react";

const CAPABILITIES = [
  {
    icon: CalendarDays,
    title: "Workforce and scheduling",
    desc: "Manage employee records, rota planning, attendance visibility and shift coverage with workflows designed for hospitality teams.",
  },
  {
    icon: Banknote,
    title: "Payroll and people administration",
    desc: "Run payroll processes and core people administration without losing the operational context managers need day to day.",
  },
  {
    icon: GraduationCap,
    title: "Training and readiness",
    desc: "Assign training, track completion, manage sign-off and make sure staff are not only scheduled, but prepared for the role they are working.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance and governance",
    desc: "Manage onboarding, documents, right-to-work tracking, expiry visibility and compliance follow-through with clearer accountability.",
  },
  {
    icon: Activity,
    title: "Operational intelligence",
    desc: "Use evidence, signal mapping, effectiveness logic and quality controls to understand where standards are working and where operational gaps are building.",
  },
  {
    icon: SlidersHorizontal,
    title: "Manager control",
    desc: "Give managers one place to see what is overdue, what is weak, what needs action and where risk is starting to build.",
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
