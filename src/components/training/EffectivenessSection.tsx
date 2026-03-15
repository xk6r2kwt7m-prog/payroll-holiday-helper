/**
 * Admin-only Training Effectiveness section for the Governance Dashboard.
 * Shows aggregate effectiveness cards with click-to-filter capability.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, TrendingDown, Minus, HelpCircle, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EffectivenessMetrics } from "@/lib/training-effectiveness";

interface Props {
  metrics: EffectivenessMetrics;
  activeFilter: string;
  onFilterSelect: (filter: string) => void;
}

interface EffectivenessCard {
  key: string;
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  urgent?: boolean;
}

export function EffectivenessSection({ metrics, activeFilter, onFilterSelect }: Props) {
  if (metrics.total === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
            Training Effectiveness
          </p>
          <p className="text-xs text-muted-foreground">
            No effectiveness evaluations recorded yet. Effectiveness data will appear here once operational signals are measured against training completion windows.
          </p>
        </CardContent>
      </Card>
    );
  }

  const cards: EffectivenessCard[] = [
    {
      key: "eff_strong",
      label: "Strong Improvement",
      value: metrics.strongImprovement,
      icon: <Zap className="h-3.5 w-3.5" />,
      color: "text-success",
    },
    {
      key: "eff_improved",
      label: "Improvement",
      value: metrics.improvement,
      icon: <TrendingUp className="h-3.5 w-3.5" />,
      color: "text-success",
    },
    {
      key: "eff_unchanged",
      label: "No Change",
      value: metrics.noChange,
      icon: <Minus className="h-3.5 w-3.5" />,
      color: "text-muted-foreground",
    },
    {
      key: "eff_declined",
      label: "Declined",
      value: metrics.declined,
      icon: <TrendingDown className="h-3.5 w-3.5" />,
      color: "text-destructive",
      urgent: metrics.declined > 0,
    },
    {
      key: "eff_insufficient",
      label: "Insufficient Data",
      value: metrics.insufficientData,
      icon: <HelpCircle className="h-3.5 w-3.5" />,
      color: "text-muted-foreground",
    },
  ];

  const hasActiveEffFilter = activeFilter.startsWith("eff_");

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Training Effectiveness
          </p>
          {hasActiveEffFilter && (
            <button
              onClick={() => onFilterSelect("all")}
              className="text-[10px] text-primary hover:underline font-medium"
            >
              ✕ Clear filter
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {cards.map(card => (
            card.value > 0 && (
              <button
                key={card.key}
                onClick={() => onFilterSelect(card.key)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-all",
                  activeFilter === card.key
                    ? "border-primary/40 bg-primary/10 ring-1 ring-primary/20"
                    : "border-border bg-background hover:bg-muted/50",
                  card.urgent && activeFilter !== card.key && "border-warning/30",
                )}
              >
                <span className={card.color}>{card.icon}</span>
                <span className={card.color}>{card.value}</span>
                <span className="text-muted-foreground">{card.label}</span>
              </button>
            )
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
