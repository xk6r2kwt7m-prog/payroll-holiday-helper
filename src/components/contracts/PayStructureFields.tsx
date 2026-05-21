/**
 * Phase 3 — Pay structure form block + NMW gate.
 *
 * Captures, separately:
 *   - Base hourly rate          (NMW-eligible)
 *   - Guaranteed service charge (NOT NMW-eligible)
 *   - Estimated service charge  (indicative only, NOT NMW-eligible)
 *   - Tronc scheme name         (optional)
 *   - Service charge policy note (optional)
 *
 * Service charge is NEVER counted toward National Minimum Wage. The gate
 * blocks issuing a contract whose base hourly rate is below the applicable
 * UK NMW for the employee's age band, unless a manager records an override
 * reason (audited via `contract_minimum_wage_overrides`).
 */
import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Banknote, ShieldAlert } from "lucide-react";
import {
  evaluateWageCompliance,
  getApplicableRateSet,
  getWageBandForAge,
  calculateAgeYears,
} from "@/lib/uk-minimum-wage";
import type { ContractVariables } from "./contractTemplates";
import { sourceLabel, type ContractFieldSource } from "@/lib/contract-form-review";

export interface NmwOverrideState {
  /** True only when the user has explicitly chosen to override. */
  acknowledged: boolean;
  reason: string;
  /** Snapshot of the rate/required when overridden, for the audit row. */
  base_hourly_rate: number;
  required_minimum_rate: number;
  age_band: string | null;
}

interface Props {
  variables: ContractVariables;
  onChange: (field: keyof ContractVariables, value: string) => void;
  employeeDob: string | null;
  effectiveDate: string;
  onOverrideChange: (next: NmwOverrideState | null) => void;
  nmwOverride: NmwOverrideState | null;
  /**
   * Phase 5G — optional resolved source map for pay fields. When provided,
   * each pay-related input renders a small muted helper label indicating
   * whether the value came from active terms, the employee profile, manual
   * entry, etc. Read-only display; no calculation logic is affected.
   */
  fieldSources?: Partial<Record<keyof ContractVariables, ContractFieldSource>>;
}


export function PayStructureFields({
  variables,
  onChange,
  employeeDob,
  effectiveDate,
  onOverrideChange,
  nmwOverride,
  fieldSources,
}: Props) {
  const PaySourceHint = ({ field }: { field: keyof ContractVariables }) => {
    const src = fieldSources?.[field];
    if (!src) return null;
    return (
      <p
        data-testid={`pay-source-${field}`}
        data-source={src}
        className="text-[10px] text-muted-foreground mt-1"
      >
        {sourceLabel(src)}
      </p>
    );
  };

  const referenceDate = useMemo(() => {
    const d = effectiveDate ? new Date(effectiveDate) : new Date();
    return isNaN(d.getTime()) ? new Date() : d;
  }, [effectiveDate]);

  const baseRate = Number(variables.baseHourlyRate) || 0;
  const guaranteedSc = Number(variables.guaranteedServiceChargeRate) || 0;
  const estimatedSc = Number(variables.estimatedServiceChargeRate) || 0;
  const totalEstimated = +(baseRate + guaranteedSc + estimatedSc).toFixed(2);

  const compliance = evaluateWageCompliance({
    dobIso: employeeDob || "",
    hourlyRate: baseRate || null,
    referenceDate,
  });

  const age = employeeDob ? calculateAgeYears(employeeDob, referenceDate) : null;
  const rateSet = getApplicableRateSet(referenceDate);
  const band = age !== null ? getWageBandForAge(age) : null;
  const required = band ? rateSet.rates[band] : null;

  const isBlocked = compliance.status === "below";
  const overrideActive =
    !!nmwOverride?.acknowledged && nmwOverride.reason.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-3 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <Banknote className="h-3.5 w-3.5 text-primary" />
          Pay structure
          <span className="text-[10px] font-normal text-muted-foreground ml-auto">
            Base + service charge are stored separately.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Base hourly rate (£)
            </Label>
            <Input
              value={variables.baseHourlyRate}
              onChange={(e) => onChange("baseHourlyRate", e.target.value)}
              placeholder="12.21"
              className="bg-card"
              inputMode="decimal"
            />
            <PaySourceHint field="baseHourlyRate" />
            <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
              Contractual hourly rate before any service charge, tronc, bonus
              or discretionary payment. National Minimum Wage is measured
              against this figure only.
            </p>

          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Guaranteed service charge / hour (£)
            </Label>
            <Input
              value={variables.guaranteedServiceChargeRate}
              onChange={(e) =>
                onChange("guaranteedServiceChargeRate", e.target.value)
              }
              placeholder="0.00"
              className="bg-card"
              inputMode="decimal"
            />
            <PaySourceHint field="guaranteedServiceChargeRate" />
            <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
              Separate from base pay. Cannot be used to satisfy National
              Minimum Wage.
            </p>

          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Estimated service charge / hour (£)
            </Label>
            <Input
              value={variables.estimatedServiceChargeRate}
              onChange={(e) =>
                onChange("estimatedServiceChargeRate", e.target.value)
              }
              placeholder="0.00"
              className="bg-card"
              inputMode="decimal"
            />
            <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
              Indicative only — not guaranteed.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Tronc scheme name (optional)
            </Label>
            <Input
              value={variables.troncSchemeName}
              onChange={(e) => onChange("troncSchemeName", e.target.value)}
              placeholder="e.g. Front-of-House Tronc"
              className="bg-card"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Service charge policy note (optional)
            </Label>
            <Textarea
              value={variables.serviceChargePolicyNote}
              onChange={(e) =>
                onChange("serviceChargePolicyNote", e.target.value)
              }
              placeholder="e.g. Distributed weekly via tronc; subject to scheme rules."
              className="bg-card min-h-[40px]"
              rows={2}
            />
          </div>
        </div>

        {/* Total estimated hourly value (NOT contractual hourly rate) */}
        {(baseRate > 0 || guaranteedSc > 0 || estimatedSc > 0) && (
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-[11px] space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Base hourly rate</span>
              <span className="font-medium tabular-nums">£{baseRate.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Guaranteed service charge</span>
              <span className="font-medium tabular-nums">£{guaranteedSc.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Estimated service charge {estimatedSc > 0 ? "(not guaranteed)" : ""}
              </span>
              <span className="font-medium tabular-nums">£{estimatedSc.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-border/60 pt-1 mt-1">
              <span className="font-medium text-foreground">Total estimated hourly value</span>
              <span className="font-semibold tabular-nums">£{totalEstimated.toFixed(2)}</span>
            </div>
            <p className="text-[10px] text-muted-foreground pt-0.5">
              This is not the contractual hourly rate, the minimum wage rate,
              or a guaranteed wage.
            </p>
          </div>
        )}
      </div>

      {/* NMW gate */}
      {employeeDob && baseRate > 0 && required !== null && (
        <div
          className={
            isBlocked
              ? "rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-2"
              : compliance.status === "close"
              ? "rounded-lg border border-warning/40 bg-warning/5 p-3 space-y-1"
              : "rounded-lg border border-success/30 bg-success/5 p-3"
          }
        >
          <div className="flex items-start gap-2">
            {isBlocked ? (
              <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle
                className={`h-4 w-4 shrink-0 mt-0.5 ${
                  compliance.status === "close" ? "text-warning" : "text-success"
                }`}
              />
            )}
            <div className="flex-1 text-xs space-y-1">
              <div className="font-medium text-foreground">
                NMW check — base hourly rate only
              </div>
              <div className="text-muted-foreground">
                Age band: {compliance.bandLabel} · Required minimum £
                {required.toFixed(2)} · Base rate £{baseRate.toFixed(2)}
              </div>
              {isBlocked && (
                <div className="text-destructive">
                  The base hourly rate appears to be below the applicable
                  National Minimum Wage. Service charge cannot be used to make
                  up National Minimum Wage. Please review before issuing this
                  contract.
                </div>
              )}
            </div>
            {overrideActive && (
              <Badge variant="outline" className="text-[9px] border-destructive/40 text-destructive">
                Override recorded
              </Badge>
            )}
          </div>

          {isBlocked && (
            <div className="pt-1 space-y-2">
              <Label className="text-[11px] text-muted-foreground">
                Manager override reason (required to issue)
              </Label>
              <Textarea
                value={nmwOverride?.reason ?? ""}
                onChange={(e) =>
                  onOverrideChange({
                    acknowledged: e.target.value.trim().length > 0,
                    reason: e.target.value,
                    base_hourly_rate: baseRate,
                    required_minimum_rate: required,
                    age_band: band,
                  })
                }
                placeholder="Explain why this contract should still be issued (e.g. signed legal advice on accommodation offset)."
                rows={2}
                className="bg-card text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Recorded immutably to the contract NMW override audit log.
                Service charge is still excluded from National Minimum Wage.
              </p>
            </div>
          )}
        </div>
      )}

      {!employeeDob && baseRate > 0 && (
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
          Add the employee's date of birth to enable the NMW gate against base
          hourly rate.
        </div>
      )}
    </div>
  );
}
