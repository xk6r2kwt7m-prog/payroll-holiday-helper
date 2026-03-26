import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, Legend } from "recharts";

interface Props {
  dailyChart: { date: string; revenue: number; labourCost: number; grossProfit: number }[];
  totalRevenue: number;
  foodCostAmount: number;
  grossProfit: number;
  totalLabourCost: number;
  wasteAmount: number;
  operatingProfit: number;
}

function fmt(n: number) {
  if (Math.abs(n) >= 1000) return `£${(n / 1000).toFixed(1)}k`;
  return `£${n.toFixed(0)}`;
}

const chartConfig = {
  revenue: { label: "Revenue", color: "hsl(var(--primary))" },
  labourCost: { label: "Labour", color: "hsl(var(--destructive))" },
  grossProfit: { label: "Gross Profit", color: "hsl(142 71% 45%)" },
};

export function FinancialOverview(props: Props) {
  const breakdown = [
    { label: "Revenue", value: props.totalRevenue, pct: 100 },
    { label: "Food Cost (est.)", value: -props.foodCostAmount, pct: props.totalRevenue > 0 ? (props.foodCostAmount / props.totalRevenue) * 100 : 0 },
    { label: "Gross Profit", value: props.grossProfit, pct: props.totalRevenue > 0 ? (props.grossProfit / props.totalRevenue) * 100 : 0 },
    { label: "Labour", value: -props.totalLabourCost, pct: props.totalRevenue > 0 ? (props.totalLabourCost / props.totalRevenue) * 100 : 0 },
    { label: "Waste (est.)", value: -props.wasteAmount, pct: props.totalRevenue > 0 ? (props.wasteAmount / props.totalRevenue) * 100 : 0 },
    { label: "Operating Profit", value: props.operatingProfit, pct: props.totalRevenue > 0 ? (props.operatingProfit / props.totalRevenue) * 100 : 0 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* P&L Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">P&L Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {breakdown.map((row) => (
              <div key={row.label} className="flex items-center justify-between text-xs">
                <span className={row.label === "Operating Profit" || row.label === "Gross Profit" ? "font-semibold text-foreground" : "text-muted-foreground"}>
                  {row.label}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground tabular-nums w-10 text-right">
                    {row.pct.toFixed(1)}%
                  </span>
                  <span className={`font-medium tabular-nums w-16 text-right ${row.value < 0 ? "text-destructive" : "text-foreground"}`}>
                    {fmt(Math.abs(row.value))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Daily Revenue & Labour Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Revenue vs Labour</CardTitle>
        </CardHeader>
        <CardContent>
          {props.dailyChart.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <BarChart data={props.dailyChart} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `£${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="labourCost" fill="var(--color-labourCost)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground">
              No data for selected period
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
