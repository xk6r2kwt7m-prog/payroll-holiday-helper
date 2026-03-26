import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Plug } from "lucide-react";

export function FinancialForecast() {
  return (
    <div className="space-y-3">
      {/* Clear not-connected banner */}
      <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <Plug className="h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium text-foreground text-xs">Forecast module not yet connected</p>
          <p className="text-[10px] mt-0.5">This section will activate once forecast and target data is available in the system.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { label: "Forecast Sales vs Actual", description: "Connect POS/sales forecast data to compare planned vs actual revenue." },
          { label: "Planned Labour vs Actual", description: "Compare scheduled labour cost from rotas against actual timesheet hours. Ready to connect." },
          { label: "Target Margin vs Actual", description: "Set margin targets per site/period and track actual performance." },
          { label: "Target Waste vs Actual", description: "Set waste reduction targets and track actuals from waste tracking system." },
        ].map((t) => (
          <Card key={t.label} className="border-dashed opacity-50">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-muted-foreground">{t.label}</p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{t.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
