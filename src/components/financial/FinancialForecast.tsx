import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, TrendingUp, Utensils, Trash2 } from "lucide-react";

export function FinancialForecast() {
  const targets = [
    { label: "Forecast Sales vs Actual", icon: TrendingUp, status: "Not connected", description: "Connect POS/sales forecast data to compare planned vs actual revenue." },
    { label: "Planned Labour vs Actual", icon: Target, status: "Available", description: "Compare scheduled labour cost from rotas against actual timesheet hours." },
    { label: "Target Margin vs Actual", icon: TrendingUp, status: "Not connected", description: "Set margin targets per site/period and track actual performance." },
    { label: "Target Waste vs Actual", icon: Trash2, status: "Not connected", description: "Set waste reduction targets and track actuals from waste tracking system." },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Forecast vs Actual comparison will activate once target and forecast data is connected.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {targets.map((t) => (
          <Card key={t.label} className="border-dashed">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <t.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{t.label}</p>
                  <span className={`text-[10px] font-medium ${t.status === "Available" ? "text-emerald-600" : "text-muted-foreground"}`}>
                    {t.status}
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{t.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
