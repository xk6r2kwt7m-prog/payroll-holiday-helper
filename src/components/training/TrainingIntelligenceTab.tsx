/**
 * Training Intelligence Tab — Admin-only
 *
 * Aggregates existing intelligence views:
 *  1. Governance dashboard
 *  2. Effectiveness section
 *  3. Signal quality section
 *  4. Operational signals sync/status
 *  5. Resolved mapping visibility per module
 */

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Link2 } from "lucide-react";

import { GovernanceDashboard } from "@/components/training/GovernanceDashboard";
import { EffectivenessSection } from "@/components/training/EffectivenessSection";
import { SignalQualitySection } from "@/components/training/SignalQualitySection";
import { OperationalSignalsSyncBlock } from "@/components/training/OperationalSignalsSyncBlock";
import { ModuleSignalMappingManager } from "@/components/training/ModuleSignalMappingManager";

import { useTrainingLibrary, type TrainingLibraryItem } from "@/hooks/useTrainingLibrary";
import { useGovernanceSummary } from "@/hooks/useGovernanceSummary";
import { useTrainingEffectiveness } from "@/hooks/useTrainingEffectiveness";
import { useSignalQuality } from "@/hooks/useSignalQuality";
import { computeGovernanceMetrics } from "@/lib/governance-classification";
import type { StandardsMetadata } from "@/data/training-standards/types";

export function TrainingIntelligenceTab() {
  const { data: library = [] } = useTrainingLibrary();
  const { data: govCounts = {} } = useGovernanceSummary(true);
  const { metrics: effMetrics } = useTrainingEffectiveness(true);
  const { metrics: sqMetrics } = useSignalQuality(true, govCounts);

  const [govFilter, setGovFilter] = useState("all");
  const [selectedModuleId, setSelectedModuleId] = useState<string>("");

  const tenantModules = library.filter(i => i.tenant_id !== null || i.source_type === "adapted");
  const govMetrics = computeGovernanceMetrics(tenantModules, govCounts);

  const selectedModule = tenantModules.find(m => m.id === selectedModuleId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Training Intelligence</h2>
        <Badge variant="outline" className="text-xs">Admin</Badge>
      </div>

      {/* 1. Governance */}
      {govMetrics.total > 0 && (
        <GovernanceDashboard
          metrics={govMetrics}
          activeFilter={govFilter}
          onFilterSelect={setGovFilter}
          modules={tenantModules}
          govCounts={govCounts}
        />
      )}

      {/* 2. Effectiveness */}
      <EffectivenessSection
        metrics={effMetrics}
        activeFilter={govFilter}
        onFilterSelect={setGovFilter}
      />

      {/* 3. Signal Quality */}
      <SignalQualitySection
        metrics={sqMetrics}
        activeFilter={govFilter}
        onFilterSelect={setGovFilter}
      />

      {/* 4. Operational Signals Sync/Status */}
      <OperationalSignalsSyncBlock />

      {/* 5. Resolved Mapping Visibility */}
      <Card className="border-border bg-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Resolved Signal Mappings</span>
          </div>

          <Select value={selectedModuleId} onValueChange={setSelectedModuleId}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select a module to view mappings..." />
            </SelectTrigger>
            <SelectContent>
              {tenantModules.map(m => (
                <SelectItem key={m.id} value={m.id} className="text-xs">
                  {m.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedModule ? (
            <ModuleSignalMappingManager
              moduleId={selectedModule.id}
              standardsMetadata={selectedModule.standards_metadata as StandardsMetadata | null}
              readOnly={false}
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              Select a module above to view its resolved active signal mappings.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
