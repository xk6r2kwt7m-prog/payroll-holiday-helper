import {
  CalendarDays, Banknote, GraduationCap, ShieldCheck, Activity, SlidersHorizontal,
} from "lucide-react";

const CAPABILITIES = [
  {
    icon: CalendarDays,
    title: "Workforce & scheduling",
    desc: "Plan rotas, track attendance and keep labour aligned to what the operation actually needs.",
  },
  {
    icon: Banknote,
    title: "Payroll & people admin",
    desc: "Run payroll workflows alongside operational context — not in a silo disconnected from the floor.",
  },
  {
    icon: GraduationCap,
    title: "Training & readiness",
    desc: "Know who is trained, who is overdue and who should not be on the rota yet.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance & governance",
    desc: "Track documents, expiry dates, onboarding and right-to-work with clear accountability.",
  },
  {
    icon: Activity,
    title: "Operational intelligence",
    desc: "Surface where standards are holding and where issues are building — before they hit service.",
  },
  {
    icon: SlidersHorizontal,
    title: "Manager control",
    desc: "One view of what is overdue, incomplete or unresolved. No more stitching the picture together manually.",
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
            className="rounded-xl border border-border bg-card p-5 space-y-2.5 hover:border-primary/30 transition-colors"
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
