import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Banknote, FilePlus2, Loader2, ShieldAlert, Trash2 } from "lucide-react";
import { useCreateContractAmendment } from "@/hooks/useContractAmendments";
import {
  MATERIAL_FIELDS,
  isMaterialField,
  type AmendmentType,
  type FieldChange,
} from "@/lib/contract-amendments";
import { useToast } from "@/hooks/use-toast";
import {
  evaluateWageCompliance,
  getApplicableRateSet,
  getWageBandForAge,
  calculateAgeYears,
} from "@/lib/uk-minimum-wage";
import { useCreateNmwOverride } from "@/hooks/useNmwOverride";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previousContractId: string;
  previousContractName: string;
  employeeName: string;
  /** Required for the NMW gate. */
  employeeId?: string | null;
  employeeDob?: string | null;
}

const AMENDMENT_TYPES: { value: AmendmentType; label: string }[] = [
  { value: "salary", label: "Salary / pay structure change" },
  { value: "hours", label: "Hours change" },
  { value: "role", label: "Role change" },
  { value: "workplace", label: "Workplace change" },
  { value: "probation", label: "Probation extension" },
  { value: "clauses", label: "Clause update" },
  { value: "other", label: "Other" },
];

interface PayStructureDraft {
  enabled: boolean;
  base_hourly_rate: string;
  previous_base_hourly_rate: string;
  guaranteed_service_charge_rate: string;
  previous_guaranteed_service_charge_rate: string;
  estimated_service_charge_rate: string;
  previous_estimated_service_charge_rate: string;
  tronc_scheme_name: string;
  previous_tronc_scheme_name: string;
  service_charge_policy_note: string;
  previous_service_charge_policy_note: string;
}

const EMPTY_PAY: PayStructureDraft = {
  enabled: false,
  base_hourly_rate: "",
  previous_base_hourly_rate: "",
  guaranteed_service_charge_rate: "",
  previous_guaranteed_service_charge_rate: "",
  estimated_service_charge_rate: "",
  previous_estimated_service_charge_rate: "",
  tronc_scheme_name: "",
  previous_tronc_scheme_name: "",
  service_charge_policy_note: "",
  previous_service_charge_policy_note: "",
};

export function CreateAmendmentDialog({
  open,
  onOpenChange,
  previousContractId,
  previousContractName,
  employeeName,
  employeeId,
  employeeDob,
}: Props) {
  const { toast } = useToast();
  const create = useCreateContractAmendment();
  const createNmwOverride = useCreateNmwOverride();

  const [amendmentType, setAmendmentType] = useState<AmendmentType>("salary");
  const [summary, setSummary] = useState("");
  const [reason, setReason] = useState("");
  const [effectiveDate, setEffectiveDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [pay, setPay] = useState<PayStructureDraft>({ ...EMPTY_PAY, enabled: true });
  const [otherChanges, setOtherChanges] = useState<FieldChange[]>([]);
  const [nmwOverrideReason, setNmwOverrideReason] = useState("");

  /** Derived NMW gate state. */
  const nmwState = useMemo(() => {
    const baseNew = Number(pay.base_hourly_rate) || 0;
    if (!pay.enabled || baseNew <= 0 || !employeeDob) {
      return { applicable: false, blocked: false, required: 0, ageBand: null as string | null };
    }
    const ref = effectiveDate ? new Date(effectiveDate) : new Date();
    const refDate = isNaN(ref.getTime()) ? new Date() : ref;
    const comp = evaluateWageCompliance({
      dobIso: employeeDob,
      hourlyRate: baseNew,
      referenceDate: refDate,
    });
    const age = calculateAgeYears(employeeDob, refDate);
    const band = age !== null ? getWageBandForAge(age) : null;
    const required = band ? getApplicableRateSet(refDate).rates[band] : 0;
    return {
      applicable: true,
      blocked: comp.status === "below",
      close: comp.status === "close",
      required,
      ageBand: band,
      bandLabel: comp.bandLabel,
    };
  }, [pay.enabled, pay.base_hourly_rate, employeeDob, effectiveDate]);

  const addChange = () => {
    setOtherChanges((prev) => [
      ...prev,
      { field: "weekly_hours", label: "Contracted weekly hours", previous_value: "", new_value: "", is_material: true },
    ]);
  };

  const updateChange = (idx: number, patch: Partial<FieldChange>) => {
    setOtherChanges((prev) =>
      prev.map((c, i) => {
        if (i !== idx) return c;
        const next = { ...c, ...patch };
        if (patch.field !== undefined) {
          const known = MATERIAL_FIELDS.find((f) => f.key === patch.field);
          next.label = known?.label || patch.field;
          next.is_material = isMaterialField(patch.field);
        }
        return next;
      }),
    );
  };

  const removeChange = (idx: number) => {
    setOtherChanges((prev) => prev.filter((_, i) => i !== idx));
  };

  const reset = () => {
    setAmendmentType("salary");
    setSummary("");
    setReason("");
    setEffectiveDate(new Date().toISOString().slice(0, 10));
    setPay({ ...EMPTY_PAY, enabled: true });
    setOtherChanges([]);
    setNmwOverrideReason("");
  };

  /** Build the field_changes audit list from the structured pay section + freeform rows. */
  const buildFieldChanges = (): FieldChange[] => {
    const changes: FieldChange[] = [];
    if (pay.enabled) {
      const rows: { key: string; label: string; prev: string; next: string }[] = [
        {
          key: "base_hourly_rate",
          label: "Base hourly rate",
          prev: pay.previous_base_hourly_rate,
          next: pay.base_hourly_rate,
        },
        {
          key: "guaranteed_service_charge_rate",
          label: "Guaranteed service charge per hour",
          prev: pay.previous_guaranteed_service_charge_rate,
          next: pay.guaranteed_service_charge_rate,
        },
        {
          key: "estimated_service_charge_rate",
          label: "Estimated service charge per hour",
          prev: pay.previous_estimated_service_charge_rate,
          next: pay.estimated_service_charge_rate,
        },
        {
          key: "tronc_scheme_name",
          label: "Tronc scheme name",
          prev: pay.previous_tronc_scheme_name,
          next: pay.tronc_scheme_name,
        },
        {
          key: "service_charge_policy_note",
          label: "Service charge policy note",
          prev: pay.previous_service_charge_policy_note,
          next: pay.service_charge_policy_note,
        },
      ];
      for (const r of rows) {
        const prevTrim = (r.prev ?? "").trim();
        const nextTrim = (r.next ?? "").trim();
        if (prevTrim === "" && nextTrim === "") continue;
        if (prevTrim === nextTrim) continue;
        changes.push({
          field: r.key,
          label: r.label,
          previous_value: prevTrim,
          new_value: nextTrim,
          is_material: isMaterialField(r.key),
        });
      }
    }
    for (const c of otherChanges) {
      if (!c.field) continue;
      changes.push(c);
    }
    return changes;
  };

  const handleSubmit = async () => {
    if (!summary.trim()) {
      toast({ title: "Summary required", description: "Describe what's changing.", variant: "destructive" });
      return;
    }

    // NMW gate — base rate only, service charge ignored.
    if (nmwState.applicable && nmwState.blocked) {
      if (!nmwOverrideReason.trim()) {
        toast({
          title: "Below National Minimum Wage",
          description:
            "The base hourly rate appears to be below the applicable National Minimum Wage. Service charge cannot be used to make up National Minimum Wage. Please review before issuing this contract.",
          variant: "destructive",
        });
        return;
      }
    }

    const changes = buildFieldChanges();

    try {
      const newDoc = await create.mutateAsync({
        previousContractId,
        amendmentType,
        amendmentSummary: summary.trim(),
        reason: reason.trim() || undefined,
        effectiveDate,
        fieldChanges: changes,
      });

      // Phase 3 — write immutable NMW override audit row if the manager overrode the gate.
      if (nmwState.applicable && nmwState.blocked && nmwOverrideReason.trim() && employeeId) {
        try {
          await createNmwOverride.mutateAsync({
            employee_id: employeeId,
            contract_id: (newDoc as { id: string }).id,
            base_hourly_rate: Number(pay.base_hourly_rate) || 0,
            required_minimum_rate: nmwState.required,
            age_band: nmwState.ageBand,
            override_reason: nmwOverrideReason.trim(),
          });
        } catch (e) {
          console.error("Failed to write amendment NMW override:", e);
          toast({
            title: "Override not recorded",
            description:
              (e as Error)?.message ||
              "Amendment saved, but the NMW override audit row could not be written. Try again from the audit log.",
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Amendment created",
        description:
          "A draft amendment has been added to the version history. Upload or generate the new contract PDF and send it for signature.",
      });
      reset();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Could not create amendment",
        description: (err as Error)?.message || "Unknown error",
        variant: "destructive",
      });
    }
  };

  const changesPreview = buildFieldChanges();
  const hasMaterial = changesPreview.some((c) => c.is_material);
  const baseNew = Number(pay.base_hourly_rate) || 0;
  const baseOld = Number(pay.previous_base_hourly_rate) || 0;
  const guaranteedNew = Number(pay.guaranteed_service_charge_rate) || 0;
  const estimatedNew = Number(pay.estimated_service_charge_rate) || 0;
  const totalEstimated = +(baseNew + guaranteedNew + estimatedNew).toFixed(2);
  const overrideArmed = nmwState.applicable && nmwState.blocked && nmwOverrideReason.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePlus2 className="h-5 w-5 text-primary" />
            Create contract amendment
          </DialogTitle>
          <DialogDescription>
            {employeeName} · supersedes <span className="font-medium">{previousContractName}</span>.
            The previous version stays signed and active until the new one is fully signed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Amendment type</Label>
              <Select value={amendmentType} onValueChange={(v) => setAmendmentType(v as AmendmentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AMENDMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Effective date</Label>
              <Input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Summary (shown on the contract)</Label>
            <Input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="e.g. Base hourly rate increased from £12.21 to £13.00"
            />
          </div>

          <div>
            <Label className="text-xs">Internal reason (not on PDF)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Annual pay review, April 2026"
              rows={2}
            />
          </div>

          {/* ── Pay structure (first-class SC inputs) ───────────────────── */}
          <div className="rounded-lg border border-border bg-card p-3 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Banknote className="h-3.5 w-3.5 text-primary" />
              Pay structure changes
              <button
                type="button"
                className="text-[10px] font-normal text-muted-foreground ml-auto underline-offset-2 hover:underline"
                onClick={() => setPay((p) => ({ ...p, enabled: !p.enabled }))}
              >
                {pay.enabled ? "Skip pay changes" : "Edit pay structure"}
              </button>
            </div>

            {pay.enabled ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-[11px] text-muted-foreground mb-1.5 block">
                      Base hourly rate (£)
                    </Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Input
                        value={pay.previous_base_hourly_rate}
                        onChange={(e) =>
                          setPay((p) => ({ ...p, previous_base_hourly_rate: e.target.value }))
                        }
                        placeholder="Previous"
                        inputMode="decimal"
                        className="bg-card"
                      />
                      <Input
                        value={pay.base_hourly_rate}
                        onChange={(e) =>
                          setPay((p) => ({ ...p, base_hourly_rate: e.target.value }))
                        }
                        placeholder="New"
                        inputMode="decimal"
                        className="bg-card"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
                      Contractual hourly rate before any service charge, tronc, bonus or
                      discretionary payment. National Minimum Wage is measured against
                      this figure only.
                    </p>
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground mb-1.5 block">
                      Guaranteed service charge / hour (£)
                    </Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Input
                        value={pay.previous_guaranteed_service_charge_rate}
                        onChange={(e) =>
                          setPay((p) => ({
                            ...p,
                            previous_guaranteed_service_charge_rate: e.target.value,
                          }))
                        }
                        placeholder="Previous"
                        inputMode="decimal"
                        className="bg-card"
                      />
                      <Input
                        value={pay.guaranteed_service_charge_rate}
                        onChange={(e) =>
                          setPay((p) => ({
                            ...p,
                            guaranteed_service_charge_rate: e.target.value,
                          }))
                        }
                        placeholder="New"
                        inputMode="decimal"
                        className="bg-card"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
                      Separate from base pay. Cannot be used to satisfy National Minimum
                      Wage.
                    </p>
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground mb-1.5 block">
                      Estimated service charge / hour (£)
                    </Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Input
                        value={pay.previous_estimated_service_charge_rate}
                        onChange={(e) =>
                          setPay((p) => ({
                            ...p,
                            previous_estimated_service_charge_rate: e.target.value,
                          }))
                        }
                        placeholder="Previous"
                        inputMode="decimal"
                        className="bg-card"
                      />
                      <Input
                        value={pay.estimated_service_charge_rate}
                        onChange={(e) =>
                          setPay((p) => ({
                            ...p,
                            estimated_service_charge_rate: e.target.value,
                          }))
                        }
                        placeholder="New"
                        inputMode="decimal"
                        className="bg-card"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
                      Indicative only — not guaranteed.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] text-muted-foreground mb-1.5 block">
                      Tronc scheme name (optional)
                    </Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Input
                        value={pay.previous_tronc_scheme_name}
                        onChange={(e) =>
                          setPay((p) => ({ ...p, previous_tronc_scheme_name: e.target.value }))
                        }
                        placeholder="Previous"
                        className="bg-card"
                      />
                      <Input
                        value={pay.tronc_scheme_name}
                        onChange={(e) =>
                          setPay((p) => ({ ...p, tronc_scheme_name: e.target.value }))
                        }
                        placeholder="New"
                        className="bg-card"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground mb-1.5 block">
                      Service charge policy note (optional)
                    </Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Textarea
                        value={pay.previous_service_charge_policy_note}
                        onChange={(e) =>
                          setPay((p) => ({
                            ...p,
                            previous_service_charge_policy_note: e.target.value,
                          }))
                        }
                        placeholder="Previous"
                        rows={2}
                        className="bg-card min-h-[40px]"
                      />
                      <Textarea
                        value={pay.service_charge_policy_note}
                        onChange={(e) =>
                          setPay((p) => ({
                            ...p,
                            service_charge_policy_note: e.target.value,
                          }))
                        }
                        placeholder="New"
                        rows={2}
                        className="bg-card min-h-[40px]"
                      />
                    </div>
                  </div>
                </div>

                {(baseNew > 0 || guaranteedNew > 0 || estimatedNew > 0) && (
                  <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base hourly rate</span>
                      <span className="font-medium tabular-nums">£{baseNew.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Guaranteed service charge</span>
                      <span className="font-medium tabular-nums">£{guaranteedNew.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Estimated service charge {estimatedNew > 0 ? "(not guaranteed)" : ""}
                      </span>
                      <span className="font-medium tabular-nums">£{estimatedNew.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-border/60 pt-1 mt-1">
                      <span className="font-medium text-foreground">Total estimated hourly value</span>
                      <span className="font-semibold tabular-nums">£{totalEstimated.toFixed(2)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground pt-0.5">
                      This is not the contractual hourly rate, the minimum wage rate, or a
                      guaranteed wage.
                    </p>
                  </div>
                )}

                {/* NMW gate */}
                {nmwState.applicable && (nmwState.blocked || nmwState.close) && (
                  <div
                    className={
                      nmwState.blocked
                        ? "rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-2"
                        : "rounded-lg border border-warning/40 bg-warning/5 p-3 space-y-1"
                    }
                  >
                    <div className="flex items-start gap-2">
                      {nmwState.blocked ? (
                        <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 text-xs space-y-1">
                        <div className="font-medium text-foreground">
                          NMW check — base hourly rate only
                        </div>
                        <div className="text-muted-foreground">
                          Age band: {nmwState.bandLabel} · Required minimum £
                          {nmwState.required.toFixed(2)} · New base rate £{baseNew.toFixed(2)}
                        </div>
                        {nmwState.blocked && (
                          <div className="text-destructive">
                            The base hourly rate appears to be below the applicable
                            National Minimum Wage. Service charge cannot be used to make
                            up National Minimum Wage. Please review before issuing this
                            contract.
                          </div>
                        )}
                      </div>
                      {overrideArmed && (
                        <Badge variant="outline" className="text-[9px] border-destructive/40 text-destructive">
                          Override recorded
                        </Badge>
                      )}
                    </div>

                    {nmwState.blocked && (
                      <div className="pt-1 space-y-2">
                        <Label className="text-[11px] text-muted-foreground">
                          Manager override reason (required to issue)
                        </Label>
                        <Textarea
                          value={nmwOverrideReason}
                          onChange={(e) => setNmwOverrideReason(e.target.value)}
                          placeholder="Explain why this amendment should still be issued."
                          rows={2}
                          className="bg-card text-xs"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Recorded immutably to the contract NMW override audit log.
                          Service charge is still excluded from National Minimum Wage.
                          Only manager-level roles can submit an override.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {nmwState.applicable && !employeeDob && (
                  <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                    Add the employee's date of birth to enable the NMW gate against base
                    hourly rate.
                  </div>
                )}
              </>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Pay structure unchanged in this amendment. Toggle above to edit base pay
                or service charge.
              </p>
            )}
          </div>

          {/* ── Other field changes ─────────────────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Other field changes (audit trail)</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addChange} className="h-7">
                + Add change
              </Button>
            </div>
            {otherChanges.map((c, idx) => (
              <div key={idx} className="rounded-lg border border-border p-2 space-y-2 bg-muted/30">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                  <div className="sm:col-span-2">
                    <Label className="text-[10px] text-muted-foreground">Field</Label>
                    <Select value={c.field} onValueChange={(v) => updateChange(idx, { field: v })}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MATERIAL_FIELDS.filter(
                          (f) =>
                            // Pay structure fields are captured by the dedicated section above.
                            ![
                              "base_hourly_rate",
                              "guaranteed_service_charge_rate",
                              "estimated_service_charge_rate",
                              "tronc_scheme_name",
                              "service_charge_policy_note",
                              "hourly_rate",
                            ].includes(f.key),
                        ).map((f) => (
                          <SelectItem key={f.key} value={f.key}>
                            {f.label}{" "}
                            <span className="text-muted-foreground text-[10px]">(material)</span>
                          </SelectItem>
                        ))}
                        <SelectItem value="clause_text">Clause text</SelectItem>
                        <SelectItem value="benefits">Benefits</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Previous</Label>
                    <Input
                      className="h-8 text-xs"
                      value={String(c.previous_value ?? "")}
                      onChange={(e) => updateChange(idx, { previous_value: e.target.value })}
                    />
                  </div>
                  <div className="flex items-end gap-1">
                    <div className="flex-1">
                      <Label className="text-[10px] text-muted-foreground">New</Label>
                      <Input
                        className="h-8 text-xs"
                        value={String(c.new_value ?? "")}
                        onChange={(e) => updateChange(idx, { new_value: e.target.value })}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeChange(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {c.is_material && (
                  <Badge variant="outline" className="text-[10px] border-warning/40 text-warning bg-warning/5">
                    Material — requires employee re-signature
                  </Badge>
                )}
              </div>
            ))}
          </div>

          {hasMaterial && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 flex gap-2 text-xs text-warning">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                This amendment changes material terms (pay, hours, role, workplace, probation or notice).
                The previous signed contract remains active until the employee and employer both sign the new version.
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={create.isPending} className="gradient-primary">
            {create.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Create draft amendment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
