import {
  CalendarDays, Banknote, GraduationCap, ShieldCheck, Activity, SlidersHorizontal,
} from "lucide-react";

const CAPABILITIES = [
  {
    icon: CalendarDays,
    title: "Workforce & scheduling",
    desc: "Plan rotas, track attendance and align labour to what the operation needs.",
  },
  {
    icon: Banknote,
    title: "Payroll & people admin",
    desc: "Run payroll with operational context — not buried in a system managers never open.",
  },
  {
    icon: GraduationCap,
    title: "Training & readiness",
    desc: "Know who is trained, who is overdue and who should not be on the rota yet.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance & governance",
    desc: "Track documents, expiry dates and right-to-work with real accountability.",
  },
  {
    icon: Activity,
    title: "Operational intelligence",
    desc: "See where standards hold and where issues are building — before service.",
  },
  {
    icon: SlidersHorizontal,
    title: "Manager control",
    desc: "One view of what is overdue, incomplete or unresolved across all modules.",
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
            className="group rounded-xl border border-border bg-card p-5 space-y-2.5 hover:border-primary/20 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/8 group-hover:bg-primary/15 transition-colors duration-300">
              <v.icon className="h-[18px] w-[18px] text-primary/70 group-hover:text-primary transition-colors duration-300" />
            </div>
            <h3 className="text-sm font-bold text-foreground tracking-tight">{v.title}</h3>
            <p className="text-[13px] text-muted-foreground leading-relaxed">{v.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
