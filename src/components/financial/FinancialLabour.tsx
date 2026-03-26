import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface Props {
  totalLabourCost: number;
  totalLabourHours: number;
  labourPct: number;
  revenuePerLabourHour: number;
  labourByDept: Record<string, number>;
  dailyChart: { date: string; revenue: number; labourCost: number }[];
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(142 71% 45%)", "hsl(var(--warning))", "hsl(var(--destructive))"];

function fmt(n: number) {
  if (Math.abs(n) >= 1000) return `£${(n / 1000).toFixed(1)}k`;
  return `£${n.toFixed(0)}`;
}

const chartConfig = {
  labourCost: { label: "Labour Cost", color: "hsl(var(--destructive))" },
  revenue: { label: "Revenue", color: "hsl(var(--primary))" },
};

export function FinancialLabour(props: Props) {
  const deptData = Object.entries(props.labourByDept)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Labour Cost", value: fmt(props.totalLabourCost) },
          { label: "Labour %", value: `${props.labourPct.toFixed(1)}%` },
          { label: "Total Hours", value: `${props.totalLabourHours.toFixed(1)}h` },
          { label: "Rev / Labour Hour", value: fmt(props.revenuePerLabourHour) },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
            <p className="text-base font-bold tabular-nums text-foreground mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Department breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Labour by Department</CardTitle>
          </CardHeader>
          <CardContent>
            {deptData.length > 0 ? (
              <div className="space-y-2">
                {deptData.map((d, i) => {
                  const maxVal = deptData[0]?.value || 1;
                  return (
                    <div key={d.name} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{d.name}</span>
                        <span className="font-medium tabular-nums">{fmt(d.value)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(d.value / maxVal) * 100}%`,
                            backgroundColor: COLORS[i % COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-8 text-center">No labour data for this period</p>
            )}
          </CardContent>
        </Card>

        {/* Revenue vs Labour daily */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Sales per Labour Hour (Daily)</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
