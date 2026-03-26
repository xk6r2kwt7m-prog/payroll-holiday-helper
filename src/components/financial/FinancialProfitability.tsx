import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { EstimatedBadge } from "./DataQualityPanel";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface Props {
  grossMarginPct: number;
  operatingMarginPct: number;
  totalRevenue: number;
  labourPct: number;
  foodCostPct: number;
  wasteAmount: number;
  operatingProfit: number;
  dailyChart: { date: string; revenue: number; grossProfit: number; operatingProfit: number }[];
}

function fmt(n: number) {
  if (Math.abs(n) >= 1000) return `£${(n / 1000).toFixed(1)}k`;
  return `£${n.toFixed(0)}`;
}

const chartConfig = {
  grossProfit: { label: "Est. Gross Profit", color: "hsl(142 71% 45%)" },
  operatingProfit: { label: "Est. Operating Profit", color: "hsl(var(--primary))" },
};

export function FinancialProfitability(props: Props) {
  return (
    <div className="space-y-4">
      {/* Estimated notice */}
      <div className="flex items-center gap-2 rounded-md border border-dashed border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span>Profitability metrics use estimated food cost (32%) and waste (2.5%). Connect real cost data for accurate margins.</span>
      </div>

      {/* Margin cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Est. Gross Margin</p>
            <EstimatedBadge />
          </div>
          <p className="text-xl font-bold tabular-nums text-muted-foreground mt-0.5">{props.grossMarginPct.toFixed(1)}%</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Est. Operating Margin</p>
            <EstimatedBadge />
          </div>
          <p className="text-xl font-bold tabular-nums text-muted-foreground mt-0.5">
            {props.operatingMarginPct.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Profit trend */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Estimated Profit Trend</CardTitle>
            <EstimatedBadge />
          </div>
        </CardHeader>
        <CardContent>
          {props.dailyChart.length > 1 ? (
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <LineChart data={props.dailyChart} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `£${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="grossProfit" stroke="var(--color-grossProfit)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="operatingProfit" stroke="var(--color-operatingProfit)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground">
              Need multiple days of data for trend
            </div>
          )}
        </CardContent>
      </Card>

      {/* Site ranking — hidden until site revenue exists */}
      <Card className="border-dashed opacity-60">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Site Performance Ranking</CardTitle>
            <span className="text-[9px] text-muted-foreground font-medium border border-border rounded px-1.5 py-0.5">Not connected</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-xs text-muted-foreground">
              Site-level ranking requires per-site revenue data.
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Connect site revenue to see which locations are strongest and weakest.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
