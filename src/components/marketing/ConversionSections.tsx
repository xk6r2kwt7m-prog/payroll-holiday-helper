import { Building2, UserCheck } from "lucide-react";

interface SectionProps {
  className?: string;
}

export function EmployerConversion({ className }: SectionProps) {
  return (
    <div className={className}>
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-4 h-full">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-base font-semibold text-foreground">For employers</h3>
        <div className="space-y-2.5 text-sm text-muted-foreground leading-relaxed">
          <p>Replace manual admin with one clear system. Build rotas, track holiday entitlements, and run payroll with fewer errors and less chasing.</p>
          <p>Post vacancies for free, receive applications, and manage onboarding, training, and compliance from the same workspace.</p>
        </div>
      </div>
    </div>
  );
}

export function CandidateConversion({ className }: SectionProps) {
  return (
    <div className={className}>
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-4 h-full">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
          <UserCheck className="h-5 w-5 text-accent" />
        </div>
        <h3 className="text-base font-semibold text-foreground">For candidates</h3>
        <div className="space-y-2.5 text-sm text-muted-foreground leading-relaxed">
          <p>Browse open roles from hospitality employers and apply directly — no middlemen, no agency fees.</p>
          <p>Control your profile visibility. Your information stays private until you choose to respond to a specific opportunity.</p>
        </div>
      </div>
    </div>
  );
}
