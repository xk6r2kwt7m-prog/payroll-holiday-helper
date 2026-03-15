import {
  Smartphone, Zap, Shield, BarChart3, Users, MessageSquare, ClipboardCheck, TrendingUp,
} from "lucide-react";

const VALUES = [
  { icon: Zap, title: "Built for hospitality", desc: "Designed around the pace of restaurants, bars, and hotels — not generic office workflows." },
  { icon: Smartphone, title: "Mobile-first", desc: "Staff and managers get full access from their phone browser. No app download needed." },
  { icon: TrendingUp, title: "Faster than spreadsheets", desc: "Connected rotas, timesheets, and payroll replace manual data entry and copy-paste errors." },
  { icon: ClipboardCheck, title: "Cleaner payroll and holidays", desc: "Accrual tracking, entitlement calculations, and pay period management in one place." },
  { icon: BarChart3, title: "Better visibility", desc: "Labour cost tracking, schedule analytics, and team readiness — available at a glance." },
  { icon: MessageSquare, title: "Structured hiring", desc: "Applications, privacy-controlled profiles, and auditable conversations in one workflow." },
  { icon: Shield, title: "Audit trails included", desc: "Sensitive actions are logged. Payroll changes, document verifications, and approvals are traceable." },
  { icon: Users, title: "Scales with you", desc: "Works for a single site. Grows to support multiple locations and larger teams." },
];

interface ValueCardsProps {
  className?: string;
}

export function ValueCards({ className }: ValueCardsProps) {
  return (
    <div className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {VALUES.map((v) => (
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
