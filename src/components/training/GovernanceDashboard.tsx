/**
 * Admin-only governance dashboard for the UGLŌ Standards library.
 * Shows aggregate health metrics with clickable cards that apply filters.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, AlertTriangle, Clock, Eye, BookOpen,
  AlertCircle, ShieldAlert, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GovernanceMetrics } from "@/lib/governance-classification";

interface Props {
  metrics: GovernanceMetrics;
  onFilterSelect: (filter: string) => void;
  activeFilter: string;
}

interface MetricCard {
  key: string;
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  urgent?: boolean;
}

export function GovernanceDashboard({ metrics, onFilterSelect, activeFilter }: Props) {
  if (metrics.total === 0) return null;

  const cards: MetricCard[] = [
    { key: "all", label: "Total", value: metrics.total, icon: <BookOpen className="h-3.5 w-3.5" />, color: "text-foreground" },
    { key: "gov_ready", label: "Ready", value: metrics.ready, icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "text-success" },
    { key: "stale", label: "Stale", value: metrics.stale, icon: <Clock className="h-3.5 w-3.5" />, color: "text-warning", urgent: metrics.stale > 0 },
    { key: "not_reviewed", label: "Unreviewed", value: metrics.unreviewed, icon: <Eye className="h-3.5 w-3.5" />, color: "text-muted-foreground" },
    { key: "gov_weak", label: "Weak", value: metrics.weak, icon: <AlertCircle className="h-3.5 w-3.5" />, color: "text-destructive", urgent: metrics.weak > 0 },
    { key: "gov_partial", label: "Partial", value: metrics.partial, icon: <ShieldCheck className="h-3.5 w-3.5" />, color: "text-primary" },
  ];

  const alertCards: MetricCard[] = [
    { key: "gov_mandatory_weak", label: "Mandatory at risk", value: metrics.mandatoryWeak, icon: <ShieldAlert className="h-3.5 w-3.5" />, color: "text-destructive", urgent: true },
    { key: "gov_high_risk", label: "High-risk concern", value: metrics.highRiskConcern, icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "text-warning", urgent: true },
  ].filter(c => c.value > 0);

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Standards Governance</p>
          {activeFilter.startsWith("gov_") && (
            <button onClick={() => onFilterSelect("all")} className="text-[10px] text-primary hover:underline">
              Clear filter
            </button>
          )}
        </div>

        {/* Primary metrics row */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {cards.map(card => (
            <button
              key={card.key}
              onClick={() => onFilterSelect(card.key)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg border px-2 py-1.5 transition-all text-center",
                activeFilter === card.key
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-background hover:bg-muted/50",
                card.urgent && card.value > 0 && "border-warning/30",
              )}
            >
              <span className={cn("tabular-nums text-base font-bold", card.color)}>
                {card.value}
              </span>
              <span className="text-[9px] text-muted-foreground leading-tight">{card.label}</span>
            </button>
          ))}
        </div>

        {/* Alert badges */}
        {alertCards.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {alertCards.map(card => (
              <button
                key={card.key}
                onClick={() => onFilterSelect(card.key)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-all",
                  activeFilter === card.key
                    ? "border-primary/30 bg-primary/5"
                    : "border-border bg-background hover:bg-muted/50",
                )}
              >
                <span className={card.color}>{card.icon}</span>
                <span className={card.color}>{card.value}</span>
                <span className="text-muted-foreground">{card.label}</span>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
