import { useMemo } from "react";
import { MapPin, Users, Clock, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { usePayrollEntryLocations } from "@/hooks/usePayrollLocations";
import { formatCurrency, formatHours } from "@/hooks/useHolidays";

const LOCATION_COLORS = [
  "hsl(168 35% 49%)",
  "hsl(28 80% 55%)",
  "hsl(200 15% 45%)",
  "hsl(340 60% 55%)",
  "hsl(45 80% 50%)",
  "hsl(260 40% 55%)",
  "hsl(120 30% 45%)",
];

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
};

interface Props {
  periodId: string;
  entries: any[];
}

export function PayrollLocationAnalytics({ periodId, entries }: Props) {
  const { data: locations = [] } = usePayrollEntryLocations(periodId);

  const analytics = useMemo(() => {
    if (locations.length === 0) return null;

    // Build rate lookup from entries
    const rateByEmployee = new Map<string, { rate: number; sc: number }>();
    for (const e of entries) {
      rateByEmployee.set(e.employee_id, {
        rate: Number(e.hourly_rate),
        sc: Number(e.service_charge || 0),
      });
    }

    const byLocation = new Map<string, {
      hours: number;
      cost: number;
      employeeIds: Set<string>;
      departments: Set<string>;
      employees: { name: string; hours: number; cost: number }[];
    }>();

    for (const loc of locations) {
      const rates = rateByEmployee.get(loc.employee_id) || { rate: 0, sc: 0 };
      const locCost = Number(loc.hours) * (rates.rate + rates.sc);
      const emp = entries.find((e: any) => e.employee_id === loc.employee_id);
      const empName = emp?.employees
        ? `${emp.employees.forename} ${emp.employees.surname}`
        : "Unknown";

      const existing = byLocation.get(loc.location_name);
      if (existing) {
        existing.hours += Number(loc.hours);
        existing.cost += locCost;
        existing.employeeIds.add(loc.employee_id);
        if (loc.department) existing.departments.add(loc.department);
        existing.employees.push({ name: empName, hours: Number(loc.hours), cost: locCost });
      } else {
        byLocation.set(loc.location_name, {
          hours: Number(loc.hours),
          cost: locCost,
          employeeIds: new Set([loc.employee_id]),
          departments: new Set(loc.department ? [loc.department] : []),
          employees: [{ name: empName, hours: Number(loc.hours), cost: locCost }],
        });
      }
    }

    return Array.from(byLocation.entries())
      .map(([name, data]) => ({
        location: name,
        hours: data.hours,
        cost: data.cost,
        headcount: data.employeeIds.size,
        departments: Array.from(data.departments),
        employees: data.employees.sort((a, b) => b.hours - a.hours),
      }))
      .sort((a, b) => b.hours - a.hours);
  }, [locations, entries]);

  if (!analytics || analytics.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        <MapPin className="h-5 w-5 mx-auto mb-2 opacity-50" />
        No location breakdown data available for this period.
        <br />
        <span className="text-xs">Import a timesheet CSV to populate location analytics.</span>
      </div>
    );
  }

  const totalHours = analytics.reduce((s, l) => s + l.hours, 0);
  const totalCost = analytics.reduce((s, l) => s + l.cost, 0);
  const totalHeadcount = new Set(locations.map(l => l.employee_id)).size;

  const pieData = analytics.map(l => ({ name: l.location, value: l.hours }));
  const barData = analytics.map(l => ({ name: l.location.replace(/\s*\(.*?\)/, ""), Hours: l.hours, Cost: l.cost }));

  return (
    <div className="space-y-4">
      {/* KPI Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-muted/30 p-3 space-y-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Locations</p>
          <p className="text-lg font-bold text-foreground">{analytics.length}</p>
        </div>
        <div className="rounded-lg bg-muted/30 p-3 space-y-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Total Hours</p>
          <p className="text-lg font-bold text-foreground">{formatHours(totalHours)}</p>
        </div>
        <div className="rounded-lg bg-muted/30 p-3 space-y-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3" /> Labour Cost</p>
          <p className="text-lg font-bold text-foreground">{formatCurrency(totalCost)}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pie Chart */}
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm font-semibold text-card-foreground mb-3">Hours by Location</p>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}
                  label={({ name, percent }) => `${name.split("(")[0].trim()} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={LOCATION_COLORS[i % LOCATION_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatHours(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm font-semibold text-card-foreground mb-3">Labour Cost by Location</p>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => name === "Hours" ? formatHours(v) : formatCurrency(v)} />
                <Bar dataKey="Cost" fill="hsl(168 35% 49%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detail Table */}
      <div className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Location</TableHead>
              <TableHead className="text-xs">Departments</TableHead>
              <TableHead className="text-right text-xs">Staff</TableHead>
              <TableHead className="text-right text-xs">Hours</TableHead>
              <TableHead className="text-right text-xs">Cost</TableHead>
              <TableHead className="text-right text-xs">% Share</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {analytics.map((loc, i) => (
              <TableRow key={loc.location}>
                <TableCell className="text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: LOCATION_COLORS[i % LOCATION_COLORS.length] }} />
                    {loc.location}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {loc.departments.map(d => (
                      <Badge key={d} variant="secondary" className="text-[10px]">{d}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right text-xs">{loc.headcount}</TableCell>
                <TableCell className="text-right text-xs">{formatHours(loc.hours)}</TableCell>
                <TableCell className="text-right text-xs font-semibold">{formatCurrency(loc.cost)}</TableCell>
                <TableCell className="text-right text-xs">
                  {totalHours > 0 ? `${((loc.hours / totalHours) * 100).toFixed(1)}%` : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
