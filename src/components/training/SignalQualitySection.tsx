/**
 * Admin-only Signal Quality section for the Governance Dashboard.
 * Shows aggregate quality cards with click-to-filter capability.
 */

import { Card, CardContent } from "@/components/ui/card";
import {
  ShieldCheck, ShieldAlert, AlertTriangle, Copy,
  Crosshair, BarChart3, MessageCircleWarning, HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SignalQualityMetrics } from "@/lib/signal-quality";

interface Props {
  metrics: SignalQualityMetrics;
  activeFilter: string;
  onFilterSelect: (filter: string) => void;
}

interface QualityCard {
  key: string;
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  urgent?: boolean;
}

export function SignalQualitySection({ metrics, activeFilter, onFilterSelect }: Props) {
  if (metrics.total === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
            Signal Quality
          </p>
          <p className="text-xs text-muted-foreground">
            No signal quality data available yet. Quality assessment will appear once review insights or evidence sources exist.
          </p>
        </CardContent>
      </Card>
    );
  }

  const statusCards: QualityCard[] = [
    { key: "sq_strong", label: "Strong", value: metrics.strong, icon: <ShieldCheck className="h-3.5 w-3.5" />, color: "text-success" },
    { key: "sq_acceptable", label: "Acceptable", value: metrics.acceptable, icon: <ShieldCheck className="h-3.5 w-3.5" />, color: "text-primary" },
    { key: "sq_weak", label: "Weak", value: metrics.weak, icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "text-warning", urgent: metrics.weak > 0 },
    { key: "sq_unreliable", label: "Unreliable", value: metrics.unreliable, icon: <ShieldAlert className="h-3.5 w-3.5" />, color: "text-destructive", urgent: metrics.unreliable > 0 },
  ];

  const issueCards: QualityCard[] = [
    { key: "sq_high_dupe", label: "High Duplicate Risk", value: metrics.highDuplicateRisk, icon: <Copy className="h-3.5 w-3.5" />, color: "text-warning" },
    { key: "sq_weak_attr", label: "Weak Attribution", value: metrics.weakAttribution, icon: <Crosshair className="h-3.5 w-3.5" />, color: "text-muted-foreground" },
    { key: "sq_low_vol", label: "Low Volume", value: metrics.lowVolume, icon: <BarChart3 className="h-3.5 w-3.5" />, color: "text-muted-foreground" },
    { key: "sq_vague", label: "Vague Signals", value: metrics.vagueSignals, icon: <MessageCircleWarning className="h-3.5 w-3.5" />, color: "text-warning" },
  ].filter(c => c.value > 0);

  const hasActiveQualityFilter = activeFilter.startsWith("sq_");

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Signal Quality
          </p>
          {hasActiveQualityFilter && (
            <button
              onClick={() => onFilterSelect("all")}
              className="text-[10px] text-primary hover:underline font-medium"
            >
              ✕ Clear filter
            </button>
          )}
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-1.5">
          {statusCards.map(card => (
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

        {/* Issue badges */}
        {issueCards.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[9px] text-muted-foreground/70 uppercase tracking-wider font-medium self-center mr-0.5">Issues:</span>
            {issueCards.map(card => (
              <button
                key={card.key}
                onClick={() => onFilterSelect(card.key)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-all",
                  activeFilter === card.key
                    ? "border-primary/40 bg-primary/10 ring-1 ring-primary/20"
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
