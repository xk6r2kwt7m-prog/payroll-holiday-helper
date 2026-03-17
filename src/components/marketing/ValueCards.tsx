import { useState } from "react";
import {
  CalendarDays, Banknote, GraduationCap, ShieldCheck, Activity, SlidersHorizontal, ChevronDown,
} from "lucide-react";

const CAPABILITIES = [
  {
    icon: CalendarDays,
    title: "Workforce & scheduling",
    desc: "Plan rotas, track attendance and align labour to what the operation needs.",
    detail: "Build rotas by role and site, manage shift swaps, track clock-in/out, and see real-time coverage gaps — all connected to training and compliance status.",
  },
  {
    icon: Banknote,
    title: "Payroll & people admin",
    desc: "Run payroll with operational context — not buried in a system managers never open.",
    detail: "UK-compliant payroll workflows with timesheet integration, overtime calculation, holiday accrual tracking and full audit trails for every pay run.",
  },
  {
    icon: GraduationCap,
    title: "Training & readiness",
    desc: "Know who is trained, who is overdue and who should not be on the rota yet.",
    detail: "Assign training by role, track completion and sign-off, link training status to scheduling eligibility, and surface overdue items before they become operational risks.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance & governance",
    desc: "Track documents, expiry dates and right-to-work with real accountability.",
    detail: "Manage document requests, verify uploads, track expiry dates with automated surfacing, and maintain a complete audit trail for every compliance action.",
  },
  {
    icon: Activity,
    title: "Operational intelligence",
    desc: "See where standards hold and where issues are building — before service.",
    detail: "Surface patterns across incidents, training gaps, compliance risk and staffing pressure so managers can act on signals, not just react to problems.",
  },
  {
    icon: SlidersHorizontal,
    title: "Manager control",
    desc: "One view of what is overdue, incomplete or unresolved across all modules.",
    detail: "A single operational dashboard connecting workforce, training, compliance and follow-through — so nothing falls between systems.",
  },
];

interface ValueCardsProps {
  className?: string;
}

export function ValueCards({ className }: ValueCardsProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <div className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CAPABILITIES.map((v, i) => {
          const isExpanded = expandedIndex === i;
          return (
            <button
              key={v.title}
              type="button"
              onClick={() => setExpandedIndex(isExpanded ? null : i)}
              className={`group text-left rounded-xl border p-5 transition-all duration-300 ${
                isExpanded
                  ? "border-primary/25 bg-primary/[0.03] shadow-md"
                  : "border-border bg-card hover:border-primary/20 hover:shadow-lg"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-300 ${
                  isExpanded ? "bg-primary/15" : "bg-primary/8 group-hover:bg-primary/15"
                }`}>
                  <v.icon className={`h-[18px] w-[18px] transition-colors duration-300 ${
                    isExpanded ? "text-primary" : "text-primary/70 group-hover:text-primary"
                  }`} />
                </div>
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground/50 shrink-0 mt-1 transition-transform duration-300 ${
                  isExpanded ? "rotate-180 text-primary" : ""
                }`} />
              </div>
              <h3 className="text-sm font-bold text-foreground tracking-tight mt-3">{v.title}</h3>
              <p className="text-[13px] text-muted-foreground leading-relaxed mt-1.5">{v.desc}</p>
              <div className={`overflow-hidden transition-all duration-300 ${
                isExpanded ? "max-h-32 opacity-100 mt-3" : "max-h-0 opacity-0"
              }`}>
                <p className="text-[13px] text-primary/80 leading-relaxed border-t border-primary/10 pt-3">
                  {v.detail}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
