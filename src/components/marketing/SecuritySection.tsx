import { Shield, Lock, Eye, Users, FileText, Server } from "lucide-react";

const POINTS = [
  { icon: Server, title: "Separated workspaces", desc: "Each company operates in its own isolated environment. Employee records, payroll, and documents are not shared across organisations." },
  { icon: Users, title: "Role-based access", desc: "Admins, managers, and staff each see only what their role requires. Sensitive data is gated behind permission checks." },
  { icon: FileText, title: "Audit trail visibility", desc: "Key actions — payroll changes, document verifications, approvals — are logged and available for review." },
  { icon: Eye, title: "Candidate privacy controls", desc: "Talent Pool profiles display first name and surname initial only. Full identity is shared only when the candidate chooses." },
  { icon: Lock, title: "Sensitive data masking", desc: "Financial data and personal records are masked by default and require intentional interaction to reveal." },
  { icon: Shield, title: "Designed with privacy in mind", desc: "Data is transmitted securely, access is scoped to the minimum required, and unnecessary exposure is avoided by design." },
];

interface SecuritySectionProps {
  className?: string;
}

export function SecuritySection({ className }: SecuritySectionProps) {
  return (
    <div className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {POINTS.map((p) => (
          <div key={p.title} className="flex gap-3.5 rounded-xl border border-border bg-card p-5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 mt-0.5">
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
