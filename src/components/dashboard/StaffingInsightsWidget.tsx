import { useMemo } from "react";
import { Users } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { useShifts } from "@/hooks/useSchedule";
import { useI18n } from "@/hooks/useI18n";
import { computeStaffingRecommendations } from "@/services/schedule-intelligence.service";
import { format, subWeeks } from "date-fns";
import { cn } from "@/lib/utils";

const DEPT_COLORS: Record<string, string> = {
  FOH: "bg-primary/10 text-primary",
  BOH: "bg-accent/10 text-accent",
  CPU: "bg-warning/10 text-warning",
};

export function StaffingInsightsWidget() {
  const { t, locale } = useI18n();
  const endDate = format(new Date(), "yyyy-MM-dd");
  const startDate = format(subWeeks(new Date(), 8), "yyyy-MM-dd");
  const { data: shifts = [] } = useShifts(startDate, endDate);

  const recommendations = useMemo(() => {
    if (shifts.length === 0) return [];
    return computeStaffingRecommendations(shifts as any, locale);
  }, [shifts, locale]);

  if (recommendations.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="rounded-xl bg-card border border-border shadow-sm p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{t("ops.staffing_insights")}</h3>
      </div>
      <p className="text-[10px] text-muted-foreground mb-3">{t("ops.staffing_description")}</p>

      <div className="grid grid-cols-2 gap-2">
        {recommendations.map((rec) => (
          <div key={rec.label} className="rounded-lg border border-border p-2.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              {rec.label}
            </p>
            <p className="text-lg font-bold text-foreground tabular-nums leading-none mb-2">
              {rec.totalStaff}
            </p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(rec.byDepartment).map(([dept, count]) => (
                <Badge
                  key={dept}
                  variant="outline"
                  className={cn("text-[9px] h-5 px-1.5", DEPT_COLORS[dept] || "bg-muted text-muted-foreground")}
                >
                  {dept} {count}
                </Badge>
              ))}
            </div>
            <p className="text-[9px] text-muted-foreground mt-1.5">
              {t("ops.data_points", { count: String(rec.dataPoints) })}
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
