import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useSetupHealth, SetupStep } from "@/hooks/useSetupHealth";
import { useI18n } from "@/hooks/useI18n";
import {
  CheckCircle2, Circle, AlertTriangle, ArrowRight, Sparkles,
  Building2, MapPin, Users, Calendar, CreditCard, Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const STEP_ICONS: Record<string, any> = {
  company_profile: Building2,
  leave_rules: Calendar,
  branches: MapPin,
  departments: Briefcase,
  payroll_settings: CreditCard,
  first_employee: Users,
};

function StepRow({ step }: { step: SetupStep }) {
  const Icon = STEP_ICONS[step.id] || Circle;
  const { t } = useI18n();

  return (
    <Link
      to={step.href}
      className={cn(
        "flex items-center gap-3 px-3 py-3 rounded-lg transition-colors group min-h-[52px]",
        step.completed
          ? "bg-muted/30"
          : "bg-card hover:bg-muted/50 border border-border"
      )}
    >
      {step.completed ? (
        <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
      ) : (
        <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-muted-foreground/30 shrink-0">
          <Icon className="h-3 w-3 text-muted-foreground/50" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium leading-tight",
          step.completed ? "text-muted-foreground line-through" : "text-foreground"
        )}>
          {step.label}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{step.description}</p>
      </div>
      {!step.completed && (
        <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
      )}
      {step.priority === "required" && !step.completed && (
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0 border-warning/50 text-warning">
          {t("common.required")}
        </Badge>
      )}
    </Link>
  );
}

export function SetupHealthWidget() {
  const health = useSetupHealth();
  const { t } = useI18n();

  if (health.isFullySetup) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 sm:p-5 pb-3 sm:pb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-foreground">{t("dashboard.setup_title")}</h3>
            <p className="text-[11px] text-muted-foreground">
              {t("dashboard.setup_steps_completed", {
                completed: health.completedCount,
                total: health.totalCount,
              })}
            </p>
          </div>
          <span className="text-lg font-bold text-primary tabular-nums">{health.percentage}%</span>
        </div>
        <Progress value={health.percentage} className="h-2" />
      </div>

      {/* Alerts */}
      {health.alerts.length > 0 && (
        <div className="px-4 sm:px-5 pb-2">
          <div className="flex flex-wrap gap-1.5">
            {health.alerts.map((alert) => (
              <Link
                key={alert.message}
                to={alert.href}
                className="flex items-center gap-1.5 text-[11px] text-warning font-medium bg-warning/10 px-2 py-1 rounded-md hover:bg-warning/20 transition-colors"
              >
                <AlertTriangle className="h-3 w-3 shrink-0" />
                {alert.message}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Checklist */}
      <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-1.5 mt-1">
        {health.steps.map((step) => (
          <StepRow key={step.id} step={step} />
        ))}
      </div>
    </motion.div>
  );
}

export function SetupHealthBadge() {
  const health = useSetupHealth();

  if (health.isFullySetup) return null;

  return (
    <Link
      to="/settings?section=company"
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-warning/10 text-warning text-[11px] font-semibold hover:bg-warning/20 transition-colors"
    >
      <AlertTriangle className="h-3.5 w-3.5" />
      Setup {health.percentage}%
    </Link>
  );
}
