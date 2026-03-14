import { useMemo } from "react";
import { useBranchLocations } from "@/hooks/useSchedule";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useShifts } from "@/hooks/useSchedule";
import { useDailyRevenue } from "@/hooks/useLabourCost";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, DollarSign, TrendingUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  branch?: string;
}

export function LiveLabourDashboard({ branch }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: timeEntries = [] } = useTimeEntries(today, today, undefined, branch);
  const { data: shifts = [] } = useShifts(today, today, branch);
  const { data: revenue } = useDailyRevenue(today);
  const { data: locations = [] } = useBranchLocations();

  const stats = useMemo(() => {
    const working = (timeEntries || []).filter((e: any) => e.status === "clocked_in").length;
    const scheduled = (shifts || []).filter((s: any) => s.employee_id).length;

    let totalHours = 0;
    let totalCost = 0;
    for (const entry of (timeEntries || []) as any[]) {
      const hours = entry.total_hours || 0;
      const rate = entry.employees?.hourly_rate || 0;
      totalHours += hours;
      totalCost += hours * rate;
    }

    const revenueAmount = revenue?.revenue_amount || 0;
    const labourPct = revenueAmount > 0 ? Math.round((totalCost / revenueAmount) * 100) : 0;
    const target = 24;
    const isOverTarget = labourPct > target;

    return { working, scheduled, totalHours, totalCost, labourPct, target, isOverTarget, revenueAmount };
  }, [timeEntries, shifts, revenue]);

  const displayBranch = branch
    ? locations.find((l) => l.branch === branch)?.display_name || branch
    : "All Locations";

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-card-foreground">{displayBranch}</h3>
          <p className="text-[11px] text-muted-foreground">Live Labour · Today</p>
        </div>
        {stats.isOverTarget && (
          <Badge variant="destructive" className="text-[10px] gap-1">
            <AlertTriangle className="h-3 w-3" /> Over target
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 divide-x divide-border">
        <StatBlock icon={Users} label="Working" value={String(stats.working)} sub={`${stats.scheduled} scheduled`} />
        <StatBlock icon={Clock} label="Hours today" value={stats.totalHours.toFixed(1)} sub="total clocked" />
      </div>
      <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
        <StatBlock
          icon={DollarSign}
          label="Labour cost"
          value={`£${stats.totalCost.toFixed(0)}`}
          sub={stats.revenueAmount > 0 ? `vs £${stats.revenueAmount.toFixed(0)} rev` : "no revenue entered"}
        />
        <StatBlock
          icon={TrendingUp}
          label="Labour %"
          value={stats.revenueAmount > 0 ? `${stats.labourPct}%` : "—"}
          sub={`Target: ${stats.target}%`}
          alert={stats.isOverTarget}
        />
      </div>
    </div>
  );
}

function StatBlock({
  icon: Icon,
  label,
  value,
  sub,
  alert,
}: {
  icon: any;
  label: string;
  value: string;
  sub: string;
  alert?: boolean;
}) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={cn("h-3.5 w-3.5", alert ? "text-destructive" : "text-muted-foreground")} />
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <p className={cn("text-lg font-bold", alert ? "text-destructive" : "text-card-foreground")}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}
