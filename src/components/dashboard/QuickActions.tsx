import { useNavigate } from "react-router-dom";
import {
  Users,
  CalendarClock,
  DollarSign,
  UserX,
  UserPlus,
  Calendar,
  Search,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";

export function QuickActions() {
  const navigate = useNavigate();
  const { t } = useI18n();

  const quickActions = [
    { icon: Search, label: t("quick_actions.find_staff"), action: "search", color: "text-foreground", bg: "bg-secondary" },
    { icon: CalendarClock, label: t("quick_actions.rota"), path: "/schedule", color: "text-primary", bg: "bg-primary/10" },
    { icon: DollarSign, label: t("quick_actions.payroll"), path: "/payroll", color: "text-primary", bg: "bg-primary/10" },
    { icon: UserX, label: t("quick_actions.absences"), path: "/absences", color: "text-destructive", bg: "bg-destructive/10" },
    { icon: Calendar, label: t("quick_actions.holidays"), path: "/holidays", color: "text-accent", bg: "bg-accent/10" },
    { icon: UserPlus, label: t("quick_actions.onboarding"), path: "/onboarding", color: "text-success", bg: "bg-success/10" },
    { icon: GraduationCap, label: t("quick_actions.training"), path: "/training", color: "text-warning", bg: "bg-warning/10" },
    { icon: Users, label: t("quick_actions.employees"), path: "/employees", color: "text-foreground", bg: "bg-secondary" },
  ];

  const handleAction = (action: typeof quickActions[0]) => {
    if (action.action === "search") {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
    } else if (action.path) {
      navigate(action.path);
    }
  };

  return (
    <div className="grid grid-cols-4 gap-3">
      {quickActions.map((action) => (
        <button
          key={action.label}
          onClick={() => handleAction(action)}
          className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-colors active:bg-muted min-h-[68px]"
        >
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", action.bg)}>
            <action.icon className={cn("h-5 w-5", action.color)} />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground leading-tight text-center">
            {action.label}
          </span>
        </button>
      ))}
    </div>
  );
}