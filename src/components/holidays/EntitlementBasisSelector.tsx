import { Info, Lock } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EntitlementBasis } from "@/lib/holiday-entitlement-basis";

interface Props {
  value: EntitlementBasis;
  onChange: (next: EntitlementBasis) => void;
  isAdmin: boolean;
  disabled?: boolean;
}

const OPTIONS: { value: EntitlementBasis; title: string; description: string; adminOnly?: boolean }[] = [
  {
    value: "current_period",
    title: "A. Current payroll period only",
    description: "Uses only actual approved hours from the selected payroll period.",
  },
  {
    value: "current_year",
    title: "B. Current holiday year only",
    description: "Uses all actual approved hours from the selected leave year, less holiday taken and already paid.",
  },
  {
    value: "full_employment",
    title: "C. Full employment period (default for leavers)",
    description: "Uses all approved hours, carry-over, holiday taken, holiday paid and audited adjustments across the full employment period.",
  },
  {
    value: "manual",
    title: "D. Manual verified adjustment",
    description: "Authorised admin only. Records a mandatory reason + supporting note and writes a manual adjustment to the ledger before settling.",
    adminOnly: true,
  },
];

export function EntitlementBasisSelector({ value, onChange, isAdmin, disabled }: Props) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-center gap-1.5">
        <Info className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-xs font-semibold text-foreground">Holiday Entitlement Basis</p>
      </div>
      <p className="text-[11px] text-muted-foreground -mt-1">
        Choose how the final entitlement is calculated. Default for leavers is C (full employment).
      </p>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as EntitlementBasis)}
        className="space-y-1.5"
        disabled={disabled}
      >
        {OPTIONS.map((o) => {
          const locked = o.adminOnly && !isAdmin;
          return (
            <label
              key={o.value}
              htmlFor={`basis-${o.value}`}
              className={cn(
                "flex items-start gap-2 rounded-md border p-2 text-xs cursor-pointer transition-colors",
                value === o.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30",
                locked && "opacity-60 cursor-not-allowed"
              )}
            >
              <RadioGroupItem id={`basis-${o.value}`} value={o.value} disabled={locked || disabled} className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-foreground">{o.title}</span>
                  {locked && (
                    <Badge variant="outline" className="text-[9px] h-4 flex items-center gap-0.5">
                      <Lock className="h-2.5 w-2.5" />
                      Admin only
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{o.description}</p>
              </div>
            </label>
          );
        })}
      </RadioGroup>
    </div>
  );
}
