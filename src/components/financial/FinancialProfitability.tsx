import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

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
  grossProfit: { label: "Gross Profit", color: "hsl(142 71% 45%)" },
  operatingProfit: { label: "Operating Profit", color: "hsl(var(--primary))" },
};

export function FinancialProfitability(props: Props) {
  // Simulated site ranking (will be real once site-level revenue is tracked)
  const sites = [
    { name: "All Sites (combined)", sales: props.totalRevenue, labourPct: props.labourPct, foodCostPct: props.foodCostPct, waste: props.wasteAmount, opProfit: props.operatingProfit },
  ];

  return (
    <div className="space-y-4">
      {/* Margin cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Gross Margin</p>
          <p className="text-xl font-bold tabular-nums text-foreground mt-0.5">{props.grossMarginPct.toFixed(1)}%</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Operating Margin</p>
          <p className={cn("text-xl font-bold tabular-nums mt-0.5", props.operatingMarginPct < 10 ? "text-destructive" : "text-foreground")}>
            {props.operatingMarginPct.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Profit trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Profit Trend</CardTitle>
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

      {/* Site ranking */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Site Performance Ranking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 font-medium text-muted-foreground">Site</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Sales</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Labour %</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Food %</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Waste</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Op. Profit</th>
                </tr>
              </thead>
              <tbody>
                {sites.map((s) => (
                  <tr key={s.name} className="border-b border-border/50">
                    <td className="py-2 font-medium">{s.name}</td>
                    <td className="py-2 text-right tabular-nums">{fmt(s.sales)}</td>
                    <td className={cn("py-2 text-right tabular-nums", s.labourPct > 35 ? "text-destructive" : "")}>
                      {s.labourPct.toFixed(1)}%
                    </td>
                    <td className="py-2 text-right tabular-nums">{s.foodCostPct.toFixed(1)}%</td>
                    <td className="py-2 text-right tabular-nums">{fmt(s.waste)}</td>
                    <td className={cn("py-2 text-right tabular-nums font-medium", s.opProfit < 0 ? "text-destructive" : "")}>
                      {fmt(s.opProfit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Site-level breakdown requires per-site revenue data. Currently showing combined totals.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
