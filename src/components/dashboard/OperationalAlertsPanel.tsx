import { useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle, Clock, UserX, ArrowUpRight, ChevronDown, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useShiftAlerts, useResolveShiftAlert } from "@/hooks/useShiftAlerts";
import { useI18n } from "@/hooks/useI18n";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ALERT_ICONS: Record<string, typeof AlertTriangle> = {
  missing_clockout: Clock,
  early_clockin: ArrowUpRight,
  late_clockin: Clock,
  overtime: AlertTriangle,
  unscheduled_work: UserX,
};

const ALERT_COLORS: Record<string, string> = {
  missing_clockout: "text-destructive",
  early_clockin: "text-warning",
  late_clockin: "text-warning",
  overtime: "text-accent",
  unscheduled_work: "text-muted-foreground",
};

export function OperationalAlertsPanel() {
  const { t } = useI18n();
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: alerts = [], isLoading } = useShiftAlerts(today, false);
  const resolveAlert = useResolveShiftAlert();
  const [expanded, setExpanded] = useState(true);

  const handleResolve = async (id: string) => {
    try {
      await resolveAlert.mutateAsync({ id });
      toast.success(t("ops.alert_resolved"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  if (!isLoading && alerts.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl bg-card border border-border shadow-sm overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <span className="text-sm font-semibold text-foreground">{t("ops.alerts_title")}</span>
          <Badge variant="outline" className="h-5 text-[10px] border-warning/30 text-warning bg-warning/5 px-1.5">
            {alerts.length}
          </Badge>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-2">
              {isLoading ? (
                <p className="text-xs text-muted-foreground py-2">{t("common.loading")}</p>
              ) : (
                alerts.slice(0, 8).map((alert: any) => {
                  const Icon = ALERT_ICONS[alert.alert_type] || AlertTriangle;
                  const color = ALERT_COLORS[alert.alert_type] || "text-muted-foreground";
                  const emp = alert.employees;
                  const name = emp ? `${emp.forename} ${emp.surname}` : "";

                  return (
                    <div
                      key={alert.id}
                      className="flex items-start gap-2.5 py-2 border-t border-border first:border-0"
                    >
                      <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", color)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground leading-tight">
                          {alert.alert_message}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {t(`ops.alert_type_${alert.alert_type}`)} · {format(new Date(alert.created_at), "HH:mm")}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 shrink-0"
                        onClick={() => handleResolve(alert.id)}
                        disabled={resolveAlert.isPending}
                      >
                        <CheckCircle className="h-3.5 w-3.5 text-success" />
                      </Button>
                    </div>
                  );
                })
              )}
              {alerts.length > 8 && (
                <p className="text-[10px] text-muted-foreground text-center pt-1">
                  +{alerts.length - 8} {t("common.more")}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
