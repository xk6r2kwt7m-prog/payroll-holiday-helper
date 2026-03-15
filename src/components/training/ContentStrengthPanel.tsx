/**
 * Admin-only content strength assessment for a training module.
 * Deterministic checks based on actual metadata fields present or missing.
 * Does NOT block publishing — guides quality decisions only.
 */

import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, Clipboard } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StandardsMetadata } from "@/data/training-standards/types";
import type { GovernanceCounts } from "@/hooks/useGovernanceSummary";

interface Props {
  metadata: StandardsMetadata | null;
  counts: GovernanceCounts;
  isHighRisk: boolean;
  isMandatory: boolean;
}

interface StrengthCheck {
  label: string;
  passed: boolean;
  /** Only shown when the check fails */
  recommendation: string;
}

function assessContentStrength(
  metadata: StandardsMetadata | null,
  counts: GovernanceCounts,
): StrengthCheck[] {
  const m = metadata ?? {};
  return [
    {
      label: "Has clear operational purpose",
      passed: !!(m.why_this_matters && m.why_this_matters.length > 20),
      recommendation: "Add a 'why this matters' explanation describing the operational purpose",
    },
    {
      label: "Has customer impact defined",
      passed: !!(m.customer_impact_areas && m.customer_impact_areas.length > 0),
      recommendation: "Define which customer impact areas this module addresses",
    },
    {
      label: "Has learning outcomes",
      passed: !!(m.learning_outcomes && m.learning_outcomes.length >= 2),
      recommendation: "Add at least 2 specific, observable learning outcomes",
    },
    {
      label: "Has practical scenario examples",
      passed: !!(m.scenario_examples && m.scenario_examples.length >= 1),
      recommendation: "Add scenario-based learning prompts for realistic training",
    },
    {
      label: "Has key behaviours defined",
      passed: !!(m.key_behaviours && m.key_behaviours.length >= 2),
      recommendation: "Define the observable behaviours expected from trained staff",
    },
    {
      label: "Has common failure points",
      passed: !!(m.common_failure_points && m.common_failure_points.length >= 1),
      recommendation: "Document common ways this standard fails in practice",
    },
    {
      label: "Has failure prevention logic",
      passed: !!(m.operational_failures_prevented && m.operational_failures_prevented.length >= 1),
      recommendation: "Clarify the operational failures this module prevents",
    },
    {
      label: "Has manager observation guidance",
      passed: !!(m.manager_observation_points && m.manager_observation_points.length >= 1),
      recommendation: "Add guidance for what managers should observe during service",
    },
    {
      label: "Has evidence attached",
      passed: counts.evidenceCount >= 1,
      recommendation: "Attach at least one evidence source to support the training content",
    },
    {
      label: "Has review insights linked",
      passed: counts.insightCount >= 1,
      recommendation: "Link review insights to connect evidence to training needs",
    },
  ];
}

export function ContentStrengthPanel({ metadata, counts, isHighRisk, isMandatory }: Props) {
  const checks = assessContentStrength(metadata, counts);
  const passedCount = checks.filter(c => c.passed).length;
  const totalCount = checks.length;
  const failedChecks = checks.filter(c => !c.passed);
  const strengthPercent = Math.round((passedCount / totalCount) * 100);

  const strengthLabel =
    strengthPercent >= 90 ? "Strong" :
    strengthPercent >= 70 ? "Good" :
    strengthPercent >= 50 ? "Partial" :
    "Weak";

  const strengthColor =
    strengthPercent >= 90 ? "text-success" :
    strengthPercent >= 70 ? "text-primary" :
    strengthPercent >= 50 ? "text-warning" :
    "text-destructive";

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/10 p-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clipboard className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Content Strength</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn("text-xs font-bold tabular-nums", strengthColor)}>
            {passedCount}/{totalCount}
          </span>
          <Badge className={cn("text-[9px]", strengthColor, "bg-transparent border border-current")}>
            {strengthLabel}
          </Badge>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            strengthPercent >= 90 ? "bg-success" :
            strengthPercent >= 70 ? "bg-primary" :
            strengthPercent >= 50 ? "bg-warning" :
            "bg-destructive",
          )}
          style={{ width: `${strengthPercent}%` }}
        />
      </div>

      {/* High-risk / mandatory warnings */}
      {isHighRisk && strengthPercent < 70 && (
        <div className="flex items-start gap-1.5 rounded-md bg-destructive/5 border border-destructive/20 px-2 py-1">
          <AlertTriangle className="h-3 w-3 text-destructive shrink-0 mt-px" />
          <p className="text-[10px] text-destructive">
            High-risk module with weak content support. This module can still be published, but it may not be reliable enough for compliance-sensitive use. Review and strengthen before relying on it operationally.
          </p>
        </div>
      )}
      {isMandatory && strengthPercent < 50 && !isHighRisk && (
        <div className="flex items-start gap-1.5 rounded-md bg-warning/5 border border-warning/20 px-2 py-1">
          <AlertTriangle className="h-3 w-3 text-warning shrink-0 mt-px" />
          <p className="text-[10px] text-warning">
            Mandatory module with limited content depth. Consider enriching before assigning at scale.
          </p>
        </div>
      )}

      {/* Checklist */}
      <div className="space-y-0.5">
        {checks.map((check, i) => (
          <div key={i} className="flex items-center gap-1.5">
            {check.passed ? (
              <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
            ) : (
              <XCircle className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            )}
            <span className={cn("text-[10px]", check.passed ? "text-foreground" : "text-muted-foreground")}>
              {check.label}
            </span>
          </div>
        ))}
      </div>

      {/* Recommended improvements */}
      {failedChecks.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-border">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Recommended Improvements</p>
          <ul className="space-y-0.5">
            {failedChecks.map((check, i) => (
              <li key={i} className="text-[10px] text-muted-foreground flex items-start gap-1">
                <span className="text-primary shrink-0">→</span>
                <span>{check.recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Derive content strength metrics for use in summary views.
 */
export function getContentStrengthScore(
  metadata: StandardsMetadata | null,
  counts: GovernanceCounts,
): { passed: number; total: number; percent: number } {
  const checks = assessContentStrength(metadata, counts);
  const passed = checks.filter(c => c.passed).length;
  return { passed, total: checks.length, percent: Math.round((passed / checks.length) * 100) };
}
