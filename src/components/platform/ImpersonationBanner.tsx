import { useImpersonation } from "@/hooks/useImpersonation";
import { Button } from "@/components/ui/button";
import { Shield, X, ArrowLeftRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function ImpersonationBanner() {
  const { active, sandboxTenantName, impersonatedRole, impersonatedUserLabel, stopImpersonation } = useImpersonation();

  if (!active) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between gap-3 text-sm font-medium shadow-md">
      <div className="flex items-center gap-2 flex-wrap">
        <Shield className="h-4 w-4 shrink-0" />
        <span>Sandbox Mode:</span>
        <Badge variant="outline" className="border-amber-700 text-amber-900 bg-amber-400/50">
          {sandboxTenantName}
        </Badge>
        <ArrowLeftRight className="h-3 w-3" />
        <Badge variant="outline" className="border-amber-700 text-amber-900 bg-amber-400/50 capitalize">
          {impersonatedUserLabel || impersonatedRole}
        </Badge>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={stopImpersonation}
        className="h-7 gap-1 text-amber-950 hover:bg-amber-600/50 hover:text-amber-950"
      >
        <X className="h-3 w-3" /> Exit
      </Button>
    </div>
  );
}
