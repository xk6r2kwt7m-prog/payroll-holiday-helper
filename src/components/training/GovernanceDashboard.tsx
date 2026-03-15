/**
 * Admin-only governance dashboard for the UGLŌ Standards library.
 * Shows aggregate health metrics, clickable filter cards, and a priority action queue.
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck, AlertTriangle, Clock, Eye, BookOpen,
  AlertCircle, ShieldAlert, CheckCircle2, ChevronDown, ChevronUp,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import {
  classifyGovernance,
  getGovernancePriority,
  getGovernanceReasons,
  GOVERNANCE_HEALTH_CONFIG,
  type GovernanceMetrics,
  type GovernanceHealth,
  type ModuleGovernanceInput,
} from "@/lib/governance-classification";
import type { GovernanceCounts } from "@/hooks/useGovernanceSummary";
import type { ServiceRiskLevel } from "@/data/training-standards/types";

interface ModuleForQueue {
  id: string;
  title: string;
  last_reviewed_at: string | null;
  is_mandatory: boolean;
  standards_metadata: { service_risk_level?: ServiceRiskLevel } | null;
}

interface Props {
  metrics: GovernanceMetrics;
  onFilterSelect: (filter: string) => void;
  activeFilter: string;
  /** Modules + counts for the priority queue */
  modules?: ModuleForQueue[];
  govCounts?: Record<string, GovernanceCounts>;
  onModuleOpen?: (id: string) => void;
}

interface MetricCard {
  key: string;
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  urgent?: boolean;
}

const MAX_QUEUE_ITEMS = 6;

export function GovernanceDashboard({ metrics, onFilterSelect, activeFilter, modules, govCounts, onModuleOpen }: Props) {
  const [queueExpanded, setQueueExpanded] = useState(false);

  if (metrics.total === 0) return null;

  const hasActiveGovFilter = activeFilter !== "all" && (
    activeFilter.startsWith("gov_") || ["stale", "not_reviewed"].includes(activeFilter)
  );

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

  const contentGapCards: MetricCard[] = [
    { key: "no_evidence", label: "No evidence", value: metrics.noEvidence, icon: <BookOpen className="h-3.5 w-3.5" />, color: "text-muted-foreground" },
    { key: "no_insights", label: "No insights", value: metrics.noInsights, icon: <Eye className="h-3.5 w-3.5" />, color: "text-muted-foreground" },
    { key: "no_scenarios", label: "No scenarios", value: metrics.noScenarios, icon: <AlertCircle className="h-3.5 w-3.5" />, color: "text-muted-foreground" },
    { key: "no_learning_outcomes", label: "No outcomes", value: metrics.noLearningOutcomes, icon: <AlertCircle className="h-3.5 w-3.5" />, color: "text-muted-foreground" },
  ].filter(c => c.value > 0);

  // Build priority queue from modules
  const queueItems = (modules && govCounts) ? buildPriorityQueue(modules, govCounts) : [];
  const visibleQueue = queueExpanded ? queueItems : queueItems.slice(0, MAX_QUEUE_ITEMS);
  const hasMoreQueue = queueItems.length > MAX_QUEUE_ITEMS;

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Standards Governance</p>
          {hasActiveGovFilter && (
            <button onClick={() => onFilterSelect("all")} className="text-[10px] text-primary hover:underline font-medium">
              ✕ Clear filter
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
                  ? "border-primary/40 bg-primary/10 ring-1 ring-primary/20"
                  : "border-border bg-background hover:bg-muted/50",
                card.urgent && card.value > 0 && activeFilter !== card.key && "border-warning/30",
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

        {/* Priority action queue */}
        {queueItems.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pt-1">
              Needs Attention ({queueItems.length})
            </p>
            <div className="space-y-1">
              {visibleQueue.map(item => (
                <QueueRow key={item.id} item={item} onOpen={onModuleOpen} />
              ))}
            </div>
            {hasMoreQueue && (
              <button
                onClick={() => setQueueExpanded(!queueExpanded)}
                className="flex items-center gap-1 text-[10px] text-primary hover:underline font-medium pt-0.5"
              >
                {queueExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {queueExpanded ? "Show less" : `Show ${queueItems.length - MAX_QUEUE_ITEMS} more`}
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Queue helpers ───

interface QueueItem {
  id: string;
  title: string;
  health: GovernanceHealth;
  priority: number;
  isHighRisk: boolean;
  isMandatory: boolean;
  reasons: string[];
  evidenceCount: number;
  insightCount: number;
  lastReviewedAt: string | null;
}

function buildPriorityQueue(modules: ModuleForQueue[], govCounts: Record<string, GovernanceCounts>): QueueItem[] {
  const items: QueueItem[] = [];

  for (const mod of modules) {
    const counts = govCounts[mod.id] ?? { evidenceCount: 0, insightCount: 0 };
    const riskLevel = (mod.standards_metadata as any)?.service_risk_level as ServiceRiskLevel | undefined;
    const input: ModuleGovernanceInput = {
      lastReviewedAt: mod.last_reviewed_at,
      counts,
      isMandatory: mod.is_mandatory,
      serviceRiskLevel: riskLevel,
    };
    const health = classifyGovernance(input);
    if (health === "ready") continue; // Exclude ready modules

    items.push({
      id: mod.id,
      title: mod.title,
      health,
      priority: getGovernancePriority(input),
      isHighRisk: riskLevel === "high",
      isMandatory: mod.is_mandatory,
      reasons: getGovernanceReasons(input),
      evidenceCount: counts.evidenceCount,
      insightCount: counts.insightCount,
      lastReviewedAt: mod.last_reviewed_at,
    });
  }

  items.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    // Tie-breakers: never reviewed first, then older review, fewer evidence, fewer insights, alpha
    const aTime = a.lastReviewedAt ? new Date(a.lastReviewedAt).getTime() : 0;
    const bTime = b.lastReviewedAt ? new Date(b.lastReviewedAt).getTime() : 0;
    if (aTime !== bTime) return aTime - bTime; // 0 (never) sorts first, then oldest
    if (a.evidenceCount !== b.evidenceCount) return a.evidenceCount - b.evidenceCount;
    if (a.insightCount !== b.insightCount) return a.insightCount - b.insightCount;
    return a.title.localeCompare(b.title);
  });
  return items;
}

function QueueRow({ item, onOpen }: { item: QueueItem; onOpen?: (id: string) => void }) {
  const healthConfig = GOVERNANCE_HEALTH_CONFIG[item.health];

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-2 text-xs min-w-0 overflow-hidden">
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="font-medium text-foreground truncate text-[11px]">{item.title}</p>
        <div className="flex items-center gap-1 flex-wrap">
          <Badge className={cn("text-[8px] px-1.5 py-0 shrink-0", healthConfig.color)}>{healthConfig.label}</Badge>
          {item.isHighRisk && <Badge className="text-[8px] px-1.5 py-0 shrink-0 bg-destructive/10 text-destructive">High Risk</Badge>}
          {item.isMandatory && <Badge className="text-[8px] px-1.5 py-0 shrink-0 bg-destructive/10 text-destructive">Mandatory</Badge>}
          <span className="text-[9px] text-muted-foreground shrink-0">
            {item.evidenceCount}e · {item.insightCount}i
          </span>
        </div>
        {item.reasons.length > 0 && (
          <p className="text-[9px] text-muted-foreground truncate">{item.reasons[0]}</p>
        )}
      </div>
      {onOpen && (
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => onOpen(item.id)}>
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
