import {
  Smartphone, Zap, Shield, BarChart3, Users, MessageSquare, ClipboardCheck, TrendingUp,
} from "lucide-react";

const VALUES = [
  { icon: Zap, title: "Built for real operators", desc: "Designed around the pace and practicality of hospitality — not generic office workflows." },
  { icon: Smartphone, title: "Mobile-first for busy teams", desc: "Staff and managers get full access from their phone. No app downloads required." },
  { icon: TrendingUp, title: "Faster than spreadsheets", desc: "Connected rotas, timesheets, and payroll replace manual data entry and copy-paste errors." },
  { icon: ClipboardCheck, title: "Cleaner payroll and holidays", desc: "Accrual calculations, entitlement tracking, and pay period management in one place." },
  { icon: BarChart3, title: "Better visibility for managers", desc: "Live labour cost tracking, schedule analytics, and team readiness at a glance." },
  { icon: MessageSquare, title: "Safer hiring and communication", desc: "Structured applications, privacy-controlled profiles, and auditable conversations." },
  { icon: Shield, title: "Clear audit trails", desc: "Every sensitive action is logged. Payroll changes, document verifications, and approvals are traceable." },
  { icon: Users, title: "Scales with growth", desc: "Works for a single site or a multi-location group. Add locations and team members as you grow." },
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
              <v.icon className="h-4.5 w-4.5 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">{v.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{v.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
