import { Building2, UserCheck } from "lucide-react";

interface SectionProps {
  className?: string;
}

export function EmployerConversion({ className }: SectionProps) {
  return (
    <div className={className}>
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">For restaurants and hospitality teams</h3>
        <div className="space-y-2.5 text-sm text-muted-foreground leading-relaxed">
          <p>Replace manual admin with one clear system. Build rotas in minutes, track holiday entitlements accurately, and run payroll with confidence.</p>
          <p>Hire faster with free vacancy posting and a built-in talent pool. Manage onboarding, training, and compliance without switching between tools.</p>
          <p>Better visibility for managers. Less chasing for admins. Clearer records for everyone.</p>
        </div>
      </div>
    </div>
  );
}

export function CandidateConversion({ className }: SectionProps) {
  return (
    <div className={className}>
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
          <UserCheck className="h-5 w-5 text-accent" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">For hospitality professionals</h3>
        <div className="space-y-2.5 text-sm text-muted-foreground leading-relaxed">
          <p>Discover roles in one place. Browse open vacancies from hospitality employers and apply directly — no middlemen, no agency fees.</p>
          <p>Control your profile visibility. Choose when to appear in the talent pool and who can contact you. Your information stays private until you decide to engage.</p>
          <p>Respond to opportunities clearly and keep track of your applications in one simple inbox.</p>
        </div>
      </div>
    </div>
  );
}
