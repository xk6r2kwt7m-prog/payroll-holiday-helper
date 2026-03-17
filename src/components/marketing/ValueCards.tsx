import {
  CalendarDays, Banknote, GraduationCap, ShieldCheck, Activity, SlidersHorizontal,
} from "lucide-react";

const CAPABILITIES = [
  {
    icon: CalendarDays,
    title: "Workforce & scheduling",
    desc: "Plan rotas, track attendance and keep labour aligned to what the operation actually needs — not what a spreadsheet says.",
  },
  {
    icon: Banknote,
    title: "Payroll & people admin",
    desc: "Run payroll workflows with operational context attached, not buried in a separate system managers never open.",
  },
  {
    icon: GraduationCap,
    title: "Training & readiness",
    desc: "Know who is trained, who is overdue and who should not be on the rota yet — before it becomes a problem in service.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance & governance",
    desc: "Track documents, expiry dates, onboarding and right-to-work — with accountability that does not rely on memory.",
  },
  {
    icon: Activity,
    title: "Operational intelligence",
    desc: "See where standards are holding and where issues are building, so managers act before problems reach the floor.",
  },
  {
    icon: SlidersHorizontal,
    title: "Manager control",
    desc: "One view of what is overdue, incomplete or unresolved — no more pulling the picture together across five systems.",
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
            className="group rounded-xl border border-border bg-card p-5 space-y-2.5 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/15 group-hover:scale-105 transition-all duration-200">
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
