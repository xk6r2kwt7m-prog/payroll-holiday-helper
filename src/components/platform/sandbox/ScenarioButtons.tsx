import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Briefcase, CreditCard } from "lucide-react";
import type { SandboxConfig } from "@/hooks/useSandbox";

interface Scenario {
  key: string;
  label: string;
  icon: React.ReactNode;
  desc: string;
  config: Partial<SandboxConfig>;
}

const SCENARIOS: Scenario[] = [
  {
    key: "new_tenant",
    label: "New Tenant",
    icon: <Building2 className="h-4 w-4" />,
    desc: "Empty signup, no data",
    config: {
      tenantName: "New Tenant Test",
      preset: "empty",
      setupState: "new_signup",
      seedTalentProfiles: false,
      seedVacancies: false,
      seedPayrollPeriods: false,
      seedArchivedLeaver: false,
      serviceChargeEnabled: false,
      locationCount: 1,
    },
  },
  {
    key: "hiring",
    label: "Hiring Tenant",
    icon: <Users className="h-4 w-4" />,
    desc: "Active restaurant with vacancies",
    config: {
      tenantName: "Hiring Restaurant",
      preset: "small_restaurant",
      setupState: "fully_configured",
      seedTalentProfiles: true,
      seedVacancies: true,
      seedPayrollPeriods: false,
      seedArchivedLeaver: false,
      serviceChargeEnabled: false,
      locationCount: 1,
    },
  },
  {
    key: "talent",
    label: "Talent Marketplace",
    icon: <Briefcase className="h-4 w-4" />,
    desc: "Vacancies + talent profiles + leaver",
    config: {
      tenantName: "Talent Test Group",
      preset: "multi_branch",
      setupState: "fully_configured",
      seedTalentProfiles: true,
      seedVacancies: true,
      seedPayrollPeriods: false,
      seedArchivedLeaver: true,
      serviceChargeEnabled: false,
      locationCount: 2,
    },
  },
  {
    key: "billing",
    label: "Billing Test",
    icon: <CreditCard className="h-4 w-4" />,
    desc: "Fully seeded for credit & payroll flows",
    config: {
      tenantName: "Billing Test Venue",
      preset: "small_restaurant",
      setupState: "fully_configured",
      seedTalentProfiles: true,
      seedVacancies: true,
      seedPayrollPeriods: true,
      seedArchivedLeaver: false,
      serviceChargeEnabled: true,
      locationCount: 1,
    },
  },
];

interface ScenarioButtonsProps {
  onSelect: (config: Partial<SandboxConfig>) => void;
}

export function ScenarioButtons({ onSelect }: ScenarioButtonsProps) {
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">Recommended Scenarios</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {SCENARIOS.map((s) => (
          <Button
            key={s.key}
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-auto py-2 px-3"
            onClick={() => onSelect(s.config)}
          >
            {s.icon}
            <div className="text-left">
              <div className="font-medium">{s.label}</div>
              <div className="text-[10px] text-muted-foreground font-normal">{s.desc}</div>
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
