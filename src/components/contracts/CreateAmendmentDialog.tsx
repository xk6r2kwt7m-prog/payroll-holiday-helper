import { useState } from "react";
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
import { AlertTriangle, FilePlus2, Loader2, Trash2 } from "lucide-react";
import { useCreateContractAmendment } from "@/hooks/useContractAmendments";
import {
  MATERIAL_FIELDS,
  isMaterialField,
  type AmendmentType,
  type FieldChange,
} from "@/lib/contract-amendments";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previousContractId: string;
  previousContractName: string;
  employeeName: string;
}

const AMENDMENT_TYPES: { value: AmendmentType; label: string }[] = [
  { value: "salary", label: "Salary change" },
  { value: "hours", label: "Hours change" },
  { value: "role", label: "Role change" },
  { value: "workplace", label: "Workplace change" },
  { value: "probation", label: "Probation extension" },
  { value: "clauses", label: "Clause update" },
  { value: "other", label: "Other" },
];

export function CreateAmendmentDialog({
  open,
  onOpenChange,
  previousContractId,
  previousContractName,
  employeeName,
}: Props) {
  const { toast } = useToast();
  const create = useCreateContractAmendment();

  const [amendmentType, setAmendmentType] = useState<AmendmentType>("salary");
  const [summary, setSummary] = useState("");
  const [reason, setReason] = useState("");
  const [effectiveDate, setEffectiveDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [changes, setChanges] = useState<FieldChange[]>([
    { field: "annual_salary", label: "Annual salary", previous_value: "", new_value: "", is_material: true },
  ]);

  const addChange = () => {
    setChanges((prev) => [
      ...prev,
      { field: "annual_salary", label: "Annual salary", previous_value: "", new_value: "", is_material: true },
    ]);
  };

  const updateChange = (idx: number, patch: Partial<FieldChange>) => {
    setChanges((prev) =>
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
    setChanges((prev) => prev.filter((_, i) => i !== idx));
  };

  const reset = () => {
    setAmendmentType("salary");
    setSummary("");
    setReason("");
    setEffectiveDate(new Date().toISOString().slice(0, 10));
    setChanges([
      { field: "annual_salary", label: "Annual salary", previous_value: "", new_value: "", is_material: true },
    ]);
  };

  const handleSubmit = async () => {
    if (!summary.trim()) {
      toast({ title: "Summary required", description: "Describe what's changing.", variant: "destructive" });
      return;
    }
    try {
      await create.mutateAsync({
        previousContractId,
        amendmentType,
        amendmentSummary: summary.trim(),
        reason: reason.trim() || undefined,
        effectiveDate,
        fieldChanges: changes.filter((c) => c.field),
      });
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

  const hasMaterial = changes.some((c) => c.is_material);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
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
              placeholder="e.g. Annual salary increased from £28,000 to £31,000"
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Field changes (audit trail)</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addChange} className="h-7">
                + Add change
              </Button>
            </div>
            {changes.map((c, idx) => (
              <div key={idx} className="rounded-lg border border-border p-2 space-y-2 bg-muted/30">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                  <div className="sm:col-span-2">
                    <Label className="text-[10px] text-muted-foreground">Field</Label>
                    <Select value={c.field} onValueChange={(v) => updateChange(idx, { field: v })}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MATERIAL_FIELDS.map((f) => (
                          <SelectItem key={f.key} value={f.key}>
                            {f.label} <span className="text-muted-foreground text-[10px]">(material)</span>
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
