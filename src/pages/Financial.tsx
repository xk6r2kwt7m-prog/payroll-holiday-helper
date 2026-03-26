import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FinancialFilters as FilterBar } from "@/components/financial/FinancialFilters";
import { FinancialKPICards } from "@/components/financial/FinancialKPICards";
import { FinancialInsights } from "@/components/financial/FinancialInsights";
import { FinancialOverview } from "@/components/financial/FinancialOverview";
import { FinancialLabour } from "@/components/financial/FinancialLabour";
import { FinancialProfitability } from "@/components/financial/FinancialProfitability";
import { FinancialCosts } from "@/components/financial/FinancialCosts";
import { FinancialForecast } from "@/components/financial/FinancialForecast";
import { DataQualityPanel } from "@/components/financial/DataQualityPanel";
import { PerformanceSummary } from "@/components/financial/PerformanceSummary";
import { TargetsPanel } from "@/components/financial/TargetsPanel";
import { useFinancialData, type FinancialFilters, type DatePreset } from "@/hooks/useFinancialData";
import { Loader2, TrendingUp } from "lucide-react";

export default function Financial() {
  const [filters, setFilters] = useState<FinancialFilters>({
    preset: "this_week",
    dateFrom: "",
    dateTo: "",
    site: "all",
    comparePrevious: true,
  });

  const { data, isLoading } = useFinancialData(filters);

  const dataSources = [
    { label: "Revenue", status: "live" as const },
    { label: "Labour cost", status: "live" as const },
    { label: "Labour hours", status: "live" as const },
    { label: "Dept breakdown", status: "live" as const },
    { label: "Food cost", status: "not_connected" as const },
    { label: "Gross profit", status: "estimated" as const },
    { label: "Operating profit", status: "estimated" as const },
    { label: "Waste", status: "not_connected" as const },
    { label: "Stock variance", status: "not_connected" as const },
    { label: "Site revenue", status: "not_connected" as const },
    { label: "Forecast", status: "not_connected" as const },
    { label: "Menu / items", status: "not_connected" as const },
  ];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-tight">Financial</h1>
            <p className="text-[11px] text-muted-foreground">Decision dashboard — real data highlighted, estimates clearly marked</p>
          </div>
        </div>

        {/* Filters */}
        <FilterBar filters={filters} onChange={setFilters} branches={data?.branches || []} />

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <div className="space-y-4">
            {/* Performance Summary — top-level health */}
            <PerformanceSummary
              labourPct={data.labourPct}
              revenueTrend={data.revenueTrend}
              operatingMarginPct={data.operatingMarginPct}
              revenuePerLabourHour={data.revenuePerLabourHour}
              hasRevenueData={data.hasRevenueData}
              comparePrevious={filters.comparePrevious}
            />

            {/* KPI Cards */}
            <FinancialKPICards
              totalRevenue={data.totalRevenue}
              grossProfit={data.grossProfit}
              operatingProfit={data.operatingProfit}
              labourPct={data.labourPct}
              foodCostPct={data.foodCostPct}
              operatingMarginPct={data.operatingMarginPct}
              wasteAmount={data.wasteAmount}
              stockVariance={data.stockVariance}
              revenueTrend={data.revenueTrend}
              comparePrevious={filters.comparePrevious}
              hasRevenueData={data.hasRevenueData}
            />

            {/* Targets vs Actual */}
            <TargetsPanel
              labourPct={data.labourPct}
              revenuePerLabourHour={data.revenuePerLabourHour}
              operatingMarginPct={data.operatingMarginPct}
              hasRevenueData={data.hasRevenueData}
            />

            {/* Insights with actions */}
            <FinancialInsights insights={data.insights} />

            {/* Data Quality */}
            <DataQualityPanel sources={dataSources} />

            {/* Tabs */}
            <Tabs defaultValue="overview">
              <TabsList className="bg-muted/40 border border-border/60 p-0.5 h-auto">
                {["overview", "costs", "profitability", "labour", "forecast"].map((tab) => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="text-xs capitalize px-3 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/60"
                  >
                    {tab === "overview" ? "Overview" : tab === "costs" ? "Costs" : tab === "profitability" ? "Profit" : tab === "labour" ? "Labour" : "Forecast"}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="overview" className="mt-4">
                <FinancialOverview
                  dailyChart={data.dailyChart}
                  totalRevenue={data.totalRevenue}
                  foodCostAmount={data.foodCostAmount}
                  grossProfit={data.grossProfit}
                  totalLabourCost={data.totalLabourCost}
                  wasteAmount={data.wasteAmount}
                  operatingProfit={data.operatingProfit}
                />
              </TabsContent>

              <TabsContent value="costs" className="mt-4">
                <FinancialCosts
                  foodCostPct={data.foodCostPct}
                  foodCostAmount={data.foodCostAmount}
                  totalLabourCost={data.totalLabourCost}
                  labourPct={data.labourPct}
                  wasteAmount={data.wasteAmount}
                  wastePct={data.wastePct}
                  stockVariance={data.stockVariance}
                  totalRevenue={data.totalRevenue}
                  hasFoodCostData={data.hasFoodCostData}
                  hasWasteData={data.hasWasteData}
                />
              </TabsContent>

              <TabsContent value="profitability" className="mt-4">
                <FinancialProfitability
                  grossMarginPct={data.grossMarginPct}
                  operatingMarginPct={data.operatingMarginPct}
                  totalRevenue={data.totalRevenue}
                  labourPct={data.labourPct}
                  foodCostPct={data.foodCostPct}
                  wasteAmount={data.wasteAmount}
                  operatingProfit={data.operatingProfit}
                  dailyChart={data.dailyChart}
                />
              </TabsContent>

              <TabsContent value="labour" className="mt-4">
                <FinancialLabour
                  totalLabourCost={data.totalLabourCost}
                  totalLabourHours={data.totalLabourHours}
                  labourPct={data.labourPct}
                  revenuePerLabourHour={data.revenuePerLabourHour}
                  labourByDept={data.labourByDept}
                  dailyChart={data.dailyChart}
                />
              </TabsContent>

              <TabsContent value="forecast" className="mt-4">
                <FinancialForecast />
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
