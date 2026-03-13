import { useMemo, useState } from "react";
import { format } from "date-fns";
import { DollarSign, Clock, TrendingUp, Percent, Edit2, Check } from "lucide-react";
import { motion } from "framer-motion";
import { StatCard } from "@/components/dashboard/StatCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTodayLabourCost, useDailyRevenue, useUpsertDailyRevenue } from "@/hooks/useLabourCost";
import { useI18n } from "@/hooks/useI18n";
import { toast } from "sonner";

export function LabourCostDashboard() {
  const { t, fmt } = useI18n();
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: labour } = useTodayLabourCost(today);
  const { data: revenue } = useDailyRevenue(today);
  const upsertRevenue = useUpsertDailyRevenue();

  const [editingRevenue, setEditingRevenue] = useState(false);
  const [revenueInput, setRevenueInput] = useState("");

  const totalCost = labour?.totalCost ?? 0;
  const totalHours = labour?.totalHours ?? 0;
  const avgHourlyCost = totalHours > 0 ? totalCost / totalHours : 0;
  const revenueAmount = revenue?.revenue_amount ?? 0;
  const labourPercent = revenueAmount > 0 ? (totalCost / revenueAmount) * 100 : 0;

  const handleSaveRevenue = async () => {
    const amount = parseFloat(revenueInput);
    if (isNaN(amount) || amount < 0) {
      toast.error(t("ops.invalid_amount"));
      return;
    }
    try {
      await upsertRevenue.mutateAsync({ date: today, amount });
      setEditingRevenue(false);
      toast.success(t("common.success"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {t("ops.labour_cost_today")}
        </h2>
        {!editingRevenue ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs text-muted-foreground"
            onClick={() => {
              setRevenueInput(String(revenueAmount || ""));
              setEditingRevenue(true);
            }}
          >
            <Edit2 className="h-3 w-3" />
            {t("ops.set_revenue")}
          </Button>
        ) : (
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              value={revenueInput}
              onChange={(e) => setRevenueInput(e.target.value)}
              placeholder="0.00"
              className="h-7 w-24 text-xs"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSaveRevenue()}
            />
            <Button size="sm" className="h-7 w-7 p-0" onClick={handleSaveRevenue} disabled={upsertRevenue.isPending}>
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingRevenue(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title={t("ops.cost_today")}
          value={fmt.formatCurrency(totalCost)}
          icon={<DollarSign className="h-4 w-4" />}
          variant="primary"
          index={0}
        />
        <StatCard
          title={t("ops.hours_today")}
          value={`${totalHours.toFixed(1)}h`}
          icon={<Clock className="h-4 w-4" />}
          variant="default"
          index={1}
        />
        <StatCard
          title={t("ops.avg_hourly_cost")}
          value={fmt.formatCurrency(avgHourlyCost)}
          icon={<TrendingUp className="h-4 w-4" />}
          variant="accent"
          index={2}
        />
        <StatCard
          title={t("ops.labour_percent_revenue")}
          value={revenueAmount > 0 ? `${labourPercent.toFixed(1)}%` : "—"}
          subtitle={revenueAmount > 0 ? `${t("common.of")} ${fmt.formatCurrency(revenueAmount)}` : t("ops.no_revenue_set")}
          icon={<Percent className="h-4 w-4" />}
          variant={labourPercent > 35 ? "warning" : "success"}
          index={3}
        />
      </div>
    </div>
  );
}
