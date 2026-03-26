import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, parseISO, eachDayOfInterval } from "date-fns";

export type DatePreset = "today" | "yesterday" | "this_week" | "last_week" | "this_month" | "last_month" | "custom";

export interface FinancialFilters {
  preset: DatePreset;
  dateFrom: string;
  dateTo: string;
  site: string;
  comparePrevious: boolean;
}

export function getDateRange(preset: DatePreset, customFrom?: string, customTo?: string) {
  const today = new Date();
  switch (preset) {
    case "today":
      return { from: format(today, "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd") };
    case "yesterday": {
      const y = subDays(today, 1);
      return { from: format(y, "yyyy-MM-dd"), to: format(y, "yyyy-MM-dd") };
    }
    case "this_week":
      return { from: format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"), to: format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd") };
    case "last_week": {
      const lw = subWeeks(today, 1);
      return { from: format(startOfWeek(lw, { weekStartsOn: 1 }), "yyyy-MM-dd"), to: format(endOfWeek(lw, { weekStartsOn: 1 }), "yyyy-MM-dd") };
    }
    case "this_month":
      return { from: format(startOfMonth(today), "yyyy-MM-dd"), to: format(endOfMonth(today), "yyyy-MM-dd") };
    case "last_month": {
      const lm = subMonths(today, 1);
      return { from: format(startOfMonth(lm), "yyyy-MM-dd"), to: format(endOfMonth(lm), "yyyy-MM-dd") };
    }
    case "custom":
      return { from: customFrom || format(today, "yyyy-MM-dd"), to: customTo || format(today, "yyyy-MM-dd") };
    default:
      return { from: format(today, "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd") };
  }
}

export function getPreviousRange(from: string, to: string) {
  const f = parseISO(from);
  const t = parseISO(to);
  const days = Math.round((t.getTime() - f.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const prevTo = subDays(f, 1);
  const prevFrom = subDays(f, days);
  return { from: format(prevFrom, "yyyy-MM-dd"), to: format(prevTo, "yyyy-MM-dd") };
}

interface LabourEntry {
  total_hours: number | null;
  clock_in_time: string;
  employees: { hourly_rate: number; department: string; forename: string; surname: string } | null;
}

export function useFinancialData(filters: FinancialFilters) {
  const { tenantId } = useTenant();
  const range = getDateRange(filters.preset, filters.dateFrom, filters.dateTo);
  const prevRange = getPreviousRange(range.from, range.to);

  return useQuery({
    queryKey: ["financial_data", tenantId, range.from, range.to, filters.site, filters.comparePrevious],
    queryFn: async () => {
      if (!tenantId) return null;

      // 1. Revenue
      const { data: revenueRows } = await supabase
        .from("daily_revenue")
        .select("date, revenue_amount")
        .eq("tenant_id", tenantId)
        .gte("date", range.from)
        .lte("date", range.to);

      // 2. Previous revenue
      let prevRevenue = 0;
      if (filters.comparePrevious) {
        const { data: prevRows } = await supabase
          .from("daily_revenue")
          .select("revenue_amount")
          .eq("tenant_id", tenantId)
          .gte("date", prevRange.from)
          .lte("date", prevRange.to);
        prevRevenue = (prevRows || []).reduce((s, r) => s + (r.revenue_amount || 0), 0);
      }

      // 3. Labour
      const { data: timeEntries } = await supabase
        .from("time_entries")
        .select(`total_hours, clock_in_time, employees (hourly_rate, department, forename, surname)`)
        .eq("tenant_id", tenantId)
        .gte("clock_in_time", `${range.from}T00:00:00`)
        .lte("clock_in_time", `${range.to}T23:59:59`);

      // 4. Previous labour
      let prevLabourCost = 0;
      if (filters.comparePrevious) {
        const { data: prevTime } = await supabase
          .from("time_entries")
          .select("total_hours, employees (hourly_rate)")
          .eq("tenant_id", tenantId)
          .gte("clock_in_time", `${prevRange.from}T00:00:00`)
          .lte("clock_in_time", `${prevRange.to}T23:59:59`);
        prevLabourCost = (prevTime || []).reduce((s, e) => {
          return s + ((e.total_hours || 0) * ((e.employees as any)?.hourly_rate || 0));
        }, 0);
      }

      // 5. Branches
      const { data: branches } = await supabase
        .from("branch_locations")
        .select("branch, display_name")
        .eq("tenant_id", tenantId);

      // Calculations — REAL
      const totalRevenue = (revenueRows || []).reduce((s, r) => s + (r.revenue_amount || 0), 0);
      let totalLabourHours = 0;
      let totalLabourCost = 0;
      const labourByDept: Record<string, number> = {};
      const dailyLabour: Record<string, number> = {};

      for (const e of (timeEntries || []) as unknown as LabourEntry[]) {
        const hours = e.total_hours || 0;
        const rate = e.employees?.hourly_rate || 0;
        const cost = hours * rate;
        totalLabourHours += hours;
        totalLabourCost += cost;
        labourByDept[e.employees?.department || "Other"] = (labourByDept[e.employees?.department || "Other"] || 0) + cost;
        const day = e.clock_in_time?.substring(0, 10) || "";
        if (day) dailyLabour[day] = (dailyLabour[day] || 0) + cost;
      }

      const dailyRevenue: Record<string, number> = {};
      for (const r of (revenueRows || [])) {
        dailyRevenue[r.date] = (dailyRevenue[r.date] || 0) + r.revenue_amount;
      }

      const days = eachDayOfInterval({ start: parseISO(range.from), end: parseISO(range.to) });
      const dailyChart = days.map(d => {
        const key = format(d, "yyyy-MM-dd");
        const rev = dailyRevenue[key] || 0;
        const lab = dailyLabour[key] || 0;
        return {
          date: format(d, "dd MMM"),
          dateKey: key,
          revenue: rev,
          labourCost: lab,
          grossProfit: rev * 0.65, // ESTIMATED
          operatingProfit: rev - lab - (rev * 0.35), // ESTIMATED
        };
      });

      // REAL KPIs
      const labourPct = totalRevenue > 0 ? (totalLabourCost / totalRevenue) * 100 : 0;
      const prevLabourPct = prevRevenue > 0 ? (prevLabourCost / prevRevenue) * 100 : 0;
      const revenuePerLabourHour = totalLabourHours > 0 ? totalRevenue / totalLabourHours : 0;
      const revenueTrend = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
      const labourTrend = prevLabourPct > 0 ? labourPct - prevLabourPct : 0;

      // ESTIMATED KPIs (clearly flagged)
      const foodCostPct = 32;
      const foodCostAmount = totalRevenue * 0.32;
      const grossProfit = totalRevenue - foodCostAmount;
      const grossMarginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
      const operatingProfit = grossProfit - totalLabourCost;
      const operatingMarginPct = totalRevenue > 0 ? (operatingProfit / totalRevenue) * 100 : 0;
      const wastePct = 2.5;
      const wasteAmount = totalRevenue * 0.025;
      const stockVariance = 0;

      // Insights — ONLY from real data, unless marked estimated
      const insights: { type: "success" | "warning" | "danger" | "info"; text: string; estimated?: boolean }[] = [];

      if (totalRevenue === 0) {
        insights.push({ type: "info", text: "No revenue data recorded for this period. Add daily revenue to unlock financial insights." });
      }

      // Real insights (from live data)
      if (labourPct > 35 && totalRevenue > 0) {
        insights.push({ type: "danger", text: `Labour cost is ${labourPct.toFixed(1)}% of sales — above the 35% threshold. Review staffing levels.` });
      } else if (labourPct > 30 && totalRevenue > 0) {
        insights.push({ type: "warning", text: `Labour cost is ${labourPct.toFixed(1)}% — approaching the upper target.` });
      } else if (totalRevenue > 0 && totalLabourCost > 0) {
        insights.push({ type: "success", text: `Labour cost is well controlled at ${labourPct.toFixed(1)}% of sales.` });
      }

      if (filters.comparePrevious && totalRevenue > 0 && prevRevenue > 0) {
        if (revenueTrend > 0) {
          insights.push({ type: "success", text: `Sales are up ${revenueTrend.toFixed(1)}% vs previous period.` });
        } else {
          insights.push({ type: "warning", text: `Sales are down ${Math.abs(revenueTrend).toFixed(1)}% vs previous period.` });
        }
      }

      if (filters.comparePrevious && labourTrend > 2 && totalRevenue > 0) {
        insights.push({ type: "danger", text: `Labour cost is rising faster than sales — up ${labourTrend.toFixed(1)} percentage points.` });
      }

      if (revenuePerLabourHour > 0 && revenuePerLabourHour < 30) {
        insights.push({ type: "warning", text: `Revenue per labour hour is £${revenuePerLabourHour.toFixed(0)} — below the £30 efficiency target.` });
      } else if (revenuePerLabourHour >= 30) {
        insights.push({ type: "success", text: `Good productivity: £${revenuePerLabourHour.toFixed(0)} revenue per labour hour.` });
      }

      // Estimated insight (clearly marked)
      if (operatingMarginPct < 10 && totalRevenue > 0) {
        insights.push({ type: "danger", text: `Estimated operating margin is ${operatingMarginPct.toFixed(1)}% — below the 10% target. Food cost and waste are estimated.`, estimated: true });
      }

      return {
        range, prevRange,
        totalRevenue, prevRevenue, totalLabourCost, prevLabourCost, totalLabourHours,
        labourPct, foodCostPct, foodCostAmount, grossProfit, grossMarginPct,
        operatingProfit, operatingMarginPct, wastePct, wasteAmount, stockVariance,
        revenuePerLabourHour, revenueTrend, labourTrend,
        dailyChart, labourByDept,
        branches: branches || [],
        insights,
        hasRevenueData: totalRevenue > 0,
        hasFoodCostData: false,
        hasWasteData: false,
        hasForecastData: false,
      };
    },
    enabled: !!tenantId,
    refetchInterval: 5 * 60_000,
  });
}
