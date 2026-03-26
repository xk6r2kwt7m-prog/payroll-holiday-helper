import { TrendingUp, TrendingDown, DollarSign, Percent, AlertTriangle, BarChart3, Utensils, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPI {
  label: string;
  value: string;
  trend?: number;
  status: "good" | "warning" | "danger" | "neutral";
  icon: React.ReactNode;
  subtitle?: string;
}

interface Props {
  totalRevenue: number;
  grossProfit: number;
  operatingProfit: number;
  labourPct: number;
  foodCostPct: number;
  operatingMarginPct: number;
  wasteAmount: number;
  stockVariance: number;
  revenueTrend: number;
  comparePrevious: boolean;
  hasRevenueData: boolean;
}

function getLabourStatus(pct: number): "good" | "warning" | "danger" {
  if (pct > 35) return "danger";
  if (pct > 30) return "warning";
  return "good";
}

function getMarginStatus(pct: number): "good" | "warning" | "danger" {
  if (pct < 5) return "danger";
  if (pct < 10) return "warning";
  return "good";
}

const statusColors = {
  good: "border-l-emerald-500 bg-emerald-500/5",
  warning: "border-l-amber-500 bg-amber-500/5",
  danger: "border-l-red-500 bg-red-500/5",
  neutral: "border-l-border bg-muted/30",
};

const statusDot = {
  good: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  neutral: "bg-muted-foreground",
};

function fmt(n: number, prefix = "£") {
  if (Math.abs(n) >= 1000) return `${prefix}${(n / 1000).toFixed(1)}k`;
  return `${prefix}${n.toFixed(0)}`;
}

export function FinancialKPICards(props: Props) {
  const kpis: KPI[] = [
    {
      label: "Sales",
      value: fmt(props.totalRevenue),
      trend: props.comparePrevious ? props.revenueTrend : undefined,
      status: props.hasRevenueData ? "good" : "neutral",
      icon: <DollarSign className="h-4 w-4" />,
    },
    {
      label: "Gross Profit",
      value: fmt(props.grossProfit),
      status: props.hasRevenueData ? (props.grossProfit > 0 ? "good" : "danger") : "neutral",
      icon: <TrendingUp className="h-4 w-4" />,
      subtitle: props.hasRevenueData ? "Food cost est." : undefined,
    },
    {
      label: "Operating Profit",
      value: fmt(props.operatingProfit),
      status: props.hasRevenueData ? getMarginStatus(props.operatingMarginPct) : "neutral",
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      label: "Labour %",
      value: `${props.labourPct.toFixed(1)}%`,
      status: props.hasRevenueData ? getLabourStatus(props.labourPct) : "neutral",
      icon: <Percent className="h-4 w-4" />,
    },
    {
      label: "Food Cost %",
      value: `${props.foodCostPct.toFixed(1)}%`,
      status: "neutral",
      icon: <Utensils className="h-4 w-4" />,
      subtitle: "Placeholder",
    },
    {
      label: "Net Margin %",
      value: `${props.operatingMarginPct.toFixed(1)}%`,
      status: props.hasRevenueData ? getMarginStatus(props.operatingMarginPct) : "neutral",
      icon: <Percent className="h-4 w-4" />,
    },
    {
      label: "Waste",
      value: fmt(props.wasteAmount),
      status: "neutral",
      icon: <Trash2 className="h-4 w-4" />,
      subtitle: "Placeholder",
    },
    {
      label: "Stock Variance",
      value: fmt(props.stockVariance),
      status: "neutral",
      icon: <AlertTriangle className="h-4 w-4" />,
      subtitle: "Placeholder",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className={cn(
            "rounded-lg border border-l-[3px] p-3 transition-colors",
            statusColors[kpi.status]
          )}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
            <div className={cn("h-1.5 w-1.5 rounded-full", statusDot[kpi.status])} />
          </div>
          <p className="text-lg font-bold tabular-nums text-foreground leading-tight">{kpi.value}</p>
          <div className="flex items-center gap-1 mt-0.5">
            {kpi.trend !== undefined && (
              <span className={cn("text-[10px] font-medium flex items-center gap-0.5", kpi.trend >= 0 ? "text-emerald-600" : "text-red-500")}>
                {kpi.trend >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                {kpi.trend >= 0 ? "+" : ""}{kpi.trend.toFixed(1)}%
              </span>
            )}
            {kpi.subtitle && <span className="text-[9px] text-muted-foreground">{kpi.subtitle}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
