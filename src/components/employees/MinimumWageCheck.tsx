import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { WageComplianceResult } from "@/lib/uk-minimum-wage";

interface Props {
  result: WageComplianceResult;
  overrideReason: string;
  onOverrideReasonChange: (val: string) => void;
}

/**
 * Inline early-warning UK NMW/NLW compliance indicator shown directly
 * beneath the Hourly Rate input. Authoritative compliance is still
 * verified later in payroll against effective hourly rate.
 */
export function MinimumWageCheck({ result, overrideReason, onOverrideReasonChange }: Props) {
  if (result.status === "unknown" && result.age === null) {
    return (
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Info className="h-3.5 w-3.5" />
        {result.message}
      </p>
    );
  }

  const tone =
    result.status === "below"
      ? "border-destructive/40 bg-destructive/10 text-destructive"
      : result.status === "close"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
      : result.status === "compliant"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      : "border-border bg-muted/40 text-muted-foreground";

  const Icon =
    result.status === "below" || result.status === "close"
      ? AlertTriangle
      : result.status === "compliant"
      ? CheckCircle2
      : Info;

  return (
    <div className="space-y-2">
      <div className={cn("flex items-start gap-2 rounded-md border px-3 py-2 text-xs", tone)}>
        <Icon className="h-4 w-4 mt-0.5 shrink-0" />
        <div className="space-y-0.5">
          <div className="font-medium">{result.message}</div>
          {result.band && (
            <div className="opacity-80">
              Band: {result.bandLabel}
              {result.status === "below" && result.delta !== null && (
                <> · Shortfall £{Math.abs(result.delta).toFixed(2)}/hr</>
              )}
            </div>
          )}
        </div>
      </div>

      {result.status === "below" && (
        <div className="space-y-1.5">
          <Label htmlFor="wage_override_reason" className="text-xs font-medium text-destructive">
            Override reason (required to save below legal minimum)
          </Label>
          <Textarea
            id="wage_override_reason"
            value={overrideReason}
            onChange={(e) => onOverrideReasonChange(e.target.value)}
            placeholder="Explain why this rate is being set below the legal minimum (e.g. correcting historical record, salaried role with separate calculation, etc.)"
            className="text-xs min-h-[60px]"
          />
          <p className="text-[11px] text-muted-foreground">
            This reason will be stored in the audit log. Payroll will still verify effective hourly rate at run time.
          </p>
        </div>
      )}
    </div>
  );
}
