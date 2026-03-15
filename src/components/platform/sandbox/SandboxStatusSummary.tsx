import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";

interface SandboxStatusSummaryProps {
  sandbox: any;
  tenant: any;
}

function BoolBadge({ value, label }: { value: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {value ? (
        <Check className="h-3 w-3 text-green-600" />
      ) : (
        <X className="h-3 w-3 text-muted-foreground" />
      )}
      <span className={value ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

export function SandboxStatusSummary({ sandbox, tenant }: SandboxStatusSummaryProps) {
  const config = (sandbox.seed_config as Record<string, any>) || {};

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-xs">
      <div className="space-y-0.5">
        <span className="text-muted-foreground">Preset</span>
        <p className="font-medium"><Badge variant="outline" className="text-[10px] h-4">{sandbox.preset_name}</Badge></p>
      </div>
      <div className="space-y-0.5">
        <span className="text-muted-foreground">Setup State</span>
        <p className="font-medium"><Badge variant="secondary" className="text-[10px] h-4">{sandbox.setup_state}</Badge></p>
      </div>
      <div className="space-y-0.5">
        <span className="text-muted-foreground">Country</span>
        <p className="font-medium">{tenant?.country || "—"}</p>
      </div>
      <BoolBadge value={!!config.seedTalentProfiles} label="Talent Profiles" />
      <BoolBadge value={!!config.seedVacancies} label="Vacancies" />
      <BoolBadge value={!!config.seedPayrollPeriods} label="Payroll Periods" />
      <BoolBadge value={!!config.seedArchivedLeaver} label="Archived Leaver" />
      <BoolBadge value={!!tenant?.service_charge_enabled} label="Service Charge" />
      <div className="space-y-0.5">
        <span className="text-muted-foreground">Created</span>
        <p className="font-medium">{new Date(sandbox.created_at).toLocaleDateString()}</p>
      </div>
    </div>
  );
}
