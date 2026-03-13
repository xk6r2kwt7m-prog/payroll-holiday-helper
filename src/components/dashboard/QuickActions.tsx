import { useNavigate } from "react-router-dom";
import {
  Users, CalendarClock, DollarSign, UserX, UserPlus, Calendar, Search,
  GraduationCap, ClipboardCheck, Megaphone, MapPin, Settings, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { getRoleLevel } from "@/lib/roles";

interface QuickAction {
  icon: any;
  label: string;
  path?: string;
  action?: string;
  color: string;
  bg: string;
}

const adminActions: QuickAction[] = [
  { icon: Search, label: "Search", action: "search", color: "text-foreground", bg: "bg-secondary" },
  { icon: CalendarClock, label: "Rota", path: "/schedule", color: "text-primary", bg: "bg-primary/10" },
  { icon: DollarSign, label: "Payroll", path: "/payroll", color: "text-primary", bg: "bg-primary/10" },
  { icon: UserX, label: "Absences", path: "/absences", color: "text-destructive", bg: "bg-destructive/10" },
  { icon: Calendar, label: "Holidays", path: "/holidays", color: "text-accent", bg: "bg-accent/10" },
  { icon: UserPlus, label: "Onboarding", path: "/onboarding", color: "text-success", bg: "bg-success/10" },
  { icon: GraduationCap, label: "Training", path: "/training", color: "text-warning", bg: "bg-warning/10" },
  { icon: Users, label: "Employees", path: "/employees", color: "text-foreground", bg: "bg-secondary" },
];

const managerActions: QuickAction[] = [
  { icon: CalendarClock, label: "Rota", path: "/schedule", color: "text-primary", bg: "bg-primary/10" },
  { icon: ClipboardCheck, label: "Timesheets", path: "/timesheets", color: "text-accent", bg: "bg-accent/10" },
  { icon: Calendar, label: "Leave", path: "/holidays", color: "text-warning", bg: "bg-warning/10" },
  { icon: Megaphone, label: "Announce", path: "/announcements", color: "text-foreground", bg: "bg-secondary" },
];

const staffActions: QuickAction[] = [
  { icon: CalendarClock, label: "Schedule", path: "/schedule", color: "text-primary", bg: "bg-primary/10" },
  { icon: Calendar, label: "Time Off", path: "/holidays", color: "text-accent", bg: "bg-accent/10" },
  { icon: GraduationCap, label: "Training", path: "/training", color: "text-warning", bg: "bg-warning/10" },
  { icon: Megaphone, label: "Updates", path: "/announcements", color: "text-foreground", bg: "bg-secondary" },
];

export function QuickActions() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { role } = useAuth();
  const level = getRoleLevel(role);

  const isAdmin = level >= getRoleLevel("admin");
  const isManager = level >= getRoleLevel("manager");

  const quickActions = isAdmin ? adminActions : isManager ? managerActions : staffActions;

  const handleAction = (action: QuickAction) => {
    if (action.action === "search") {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
    } else if (action.path) {
      navigate(action.path);
    }
  };

  return (
    <div className={cn("grid gap-3", quickActions.length > 4 ? "grid-cols-4" : `grid-cols-${quickActions.length}`)}>
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
