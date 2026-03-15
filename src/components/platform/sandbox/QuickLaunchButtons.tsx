import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useImpersonation } from "@/hooks/useImpersonation";
import { LayoutDashboard, Users, Briefcase, UserCircle, CreditCard, FlaskConical } from "lucide-react";

const QUICK_LINKS = [
  { label: "Dashboard", path: "/", icon: <LayoutDashboard className="h-3 w-3" /> },
  { label: "Hiring", path: "/vacancies", icon: <Users className="h-3 w-3" /> },
  { label: "Talent Pool", path: "/talent-pool", icon: <Briefcase className="h-3 w-3" /> },
  { label: "Staff Portal", path: "/staff-portal", icon: <UserCircle className="h-3 w-3" /> },
  { label: "Billing", path: "/talent-pool?tab=billing", icon: <CreditCard className="h-3 w-3" /> },
];

export function QuickLaunchButtons() {
  const navigate = useNavigate();
  const { sandboxTenantName, impersonatedUserLabel } = useImpersonation();

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <FlaskConical className="h-3 w-3" />
        <span>Sandbox: <strong className="text-foreground">{sandboxTenantName}</strong> as <strong className="text-foreground">{impersonatedUserLabel}</strong></span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_LINKS.map((link) => (
          <Button
            key={link.path}
            size="sm"
            variant="secondary"
            className="gap-1 text-[11px] h-7 px-2"
            onClick={(e) => {
              e.stopPropagation();
              navigate(link.path);
            }}
          >
            {link.icon} {link.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
