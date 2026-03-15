/**
 * Admin-only "Why This Matters" panel for training module detail views.
 * Shows standards framework metadata — evidence basis, operational failures
 * prevented, learning outcomes, key behaviours, and review insight tags.
 *
 * This component is ONLY shown to users with manage_training permission.
 * Staff never see this metadata.
 */

import { Badge } from "@/components/ui/badge";
import {
  ShieldAlert, BookOpen, Target, AlertTriangle, Eye, Lightbulb,
  CheckSquare, XOctagon, Binoculars, Users,
} from "lucide-react";
import type { StandardsMetadata } from "@/data/training-standards/types";
import {
  EVIDENCE_BASIS_LABELS,
  OPERATIONAL_AREA_LABELS,
  SERVICE_RISK_LABELS,
  CUSTOMER_IMPACT_LABELS,
  REVIEW_INSIGHT_LABELS,
} from "@/data/training-standards/types";
import { cn } from "@/lib/utils";

interface Props {
  metadata: StandardsMetadata;
}

export function WhyThisMattersPanel({ metadata }: Props) {
  const hasContent = metadata.why_this_matters ||
    metadata.operational_failures_prevented?.length ||
    metadata.learning_outcomes?.length ||
    metadata.evidence_basis ||
    metadata.review_insight_tags?.length ||
    metadata.key_behaviours?.length ||
    metadata.common_failure_points?.length ||
    metadata.manager_observation_points?.length;

  if (!hasContent) return null;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-primary shrink-0" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Why This Matters
        </p>
        <Badge variant="outline" className="text-[9px] ml-auto">Admin Only</Badge>
      </div>

      {metadata.why_this_matters && (
        <p className="text-xs text-foreground leading-relaxed">{metadata.why_this_matters}</p>
      )}

      {/* Evidence & Risk Row */}
      <div className="flex flex-wrap gap-1.5">
        {metadata.evidence_basis && (
          <Badge variant="outline" className="text-[10px] gap-1">
            <BookOpen className="h-3 w-3" />
            {EVIDENCE_BASIS_LABELS[metadata.evidence_basis]}
          </Badge>
        )}
        {metadata.operational_area && (
          <Badge variant="outline" className="text-[10px] gap-1">
            <Target className="h-3 w-3" />
            {OPERATIONAL_AREA_LABELS[metadata.operational_area]}
          </Badge>
        )}
        {metadata.service_risk_level && (
          <Badge className={cn("text-[10px] gap-1",
            metadata.service_risk_level === "high" ? "bg-destructive/10 text-destructive" :
            metadata.service_risk_level === "medium" ? "bg-warning/10 text-warning" :
            "bg-muted text-muted-foreground"
          )}>
            <ShieldAlert className="h-3 w-3" />
            {SERVICE_RISK_LABELS[metadata.service_risk_level]} Risk
          </Badge>
        )}
      </div>

      {/* Role Relevance */}
      {metadata.role_relevance && metadata.role_relevance.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground font-medium mb-1 flex items-center gap-1">
            <Users className="h-3 w-3" /> Role Relevance
          </p>
          <div className="flex flex-wrap gap-1">
            {metadata.role_relevance.map((role, i) => (
              <Badge key={i} variant="outline" className="text-[10px]">{role}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Customer Impact */}
      {metadata.customer_impact_areas && metadata.customer_impact_areas.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground font-medium mb-1">Customer Impact</p>
          <div className="flex flex-wrap gap-1">
            {metadata.customer_impact_areas.map(area => (
              <Badge key={area} variant="secondary" className="text-[10px]">
                {CUSTOMER_IMPACT_LABELS[area]}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Review Insight Tags */}
      {metadata.review_insight_tags && metadata.review_insight_tags.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground font-medium mb-1">Linked Review Patterns</p>
          <div className="flex flex-wrap gap-1">
            {metadata.review_insight_tags.map(tag => (
              <Badge key={tag} className="text-[10px] bg-accent/10 text-accent-foreground gap-1">
                <Eye className="h-3 w-3" />
                {REVIEW_INSIGHT_LABELS[tag]}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Key Behaviours */}
      {metadata.key_behaviours && metadata.key_behaviours.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground font-medium mb-1 flex items-center gap-1">
            <CheckSquare className="h-3 w-3" /> Key Behaviours Expected
          </p>
          <ul className="space-y-0.5">
            {metadata.key_behaviours.map((b, i) => (
              <li key={i} className="text-[11px] text-foreground flex items-start gap-1.5">
                <span className="text-success font-bold shrink-0">✓</span>
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Common Failure Points */}
      {metadata.common_failure_points && metadata.common_failure_points.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground font-medium mb-1 flex items-center gap-1">
            <XOctagon className="h-3 w-3" /> Common Failure Points
          </p>
          <ul className="space-y-0.5">
            {metadata.common_failure_points.map((f, i) => (
              <li key={i} className="text-[11px] text-foreground flex items-start gap-1.5">
                <span className="text-destructive font-bold shrink-0">✗</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Operational Failures Prevented */}
      {metadata.operational_failures_prevented && metadata.operational_failures_prevented.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground font-medium mb-1">Failures Prevented</p>
          <ul className="space-y-0.5">
            {metadata.operational_failures_prevented.map((f, i) => (
              <li key={i} className="text-[11px] text-foreground flex items-start gap-1.5">
                <AlertTriangle className="h-3 w-3 text-warning shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Manager Observation Points */}
      {metadata.manager_observation_points && metadata.manager_observation_points.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground font-medium mb-1 flex items-center gap-1">
            <Binoculars className="h-3 w-3" /> Manager Observation Points
          </p>
          <ul className="space-y-0.5">
            {metadata.manager_observation_points.map((p, i) => (
              <li key={i} className="text-[11px] text-muted-foreground italic flex items-start gap-1.5">
                <span className="text-primary shrink-0">?</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Learning Outcomes */}
      {metadata.learning_outcomes && metadata.learning_outcomes.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground font-medium mb-1">Learning Outcomes</p>
          <ul className="space-y-0.5">
            {metadata.learning_outcomes.map((lo, i) => (
              <li key={i} className="text-[11px] text-foreground flex items-start gap-1.5">
                <span className="text-primary font-bold shrink-0">•</span>
                {lo}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Scenario Examples */}
      {metadata.scenario_examples && metadata.scenario_examples.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground font-medium mb-1">Scenario Examples</p>
          <ul className="space-y-1">
            {metadata.scenario_examples.map((s, i) => (
              <li key={i} className="text-[11px] text-muted-foreground italic pl-2 border-l-2 border-primary/20">
                "{s}"
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
