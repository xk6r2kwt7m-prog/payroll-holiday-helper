import { Shield, Lock, Eye, Users, FileText, Server } from "lucide-react";

const POINTS = [
  { icon: Server, title: "Tenant-separated data", desc: "Each company operates in an isolated workspace. Employee records, payroll, and documents are never shared across organisations." },
  { icon: Users, title: "Role-based access controls", desc: "Admins, managers, and staff each see only what they need. Sensitive data is gated behind permission checks." },
  { icon: FileText, title: "Audit trail visibility", desc: "Key admin actions — payroll changes, document verifications, approvals — are logged and traceable." },
  { icon: Eye, title: "Controlled candidate privacy", desc: "Talent Pool profiles show first name and surname initial only. Full identity is revealed only when the candidate chooses to engage." },
  { icon: Lock, title: "Secure admin-only actions", desc: "Financial data and sensitive HR records are masked by default and require intentional interaction to reveal." },
  { icon: Shield, title: "Designed with privacy in mind", desc: "Data is encrypted in transit, access is scoped to the minimum required, and no unnecessary information is exposed." },
];

interface SecuritySectionProps {
  className?: string;
}

export function SecuritySection({ className }: SecuritySectionProps) {
  return (
    <div className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {POINTS.map((p) => (
          <div key={p.title} className="flex gap-3.5 rounded-xl border border-border bg-card p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <p.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">{p.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">{p.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
