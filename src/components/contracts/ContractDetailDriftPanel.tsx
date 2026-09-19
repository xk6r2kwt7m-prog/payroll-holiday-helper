/**
 * Shows, on a contract card, where the produced document no longer matches the
 * details held on the staff record — and gives the administrator the two
 * legitimate ways to deal with it:
 *
 *  - unsigned contract: correct the details and reissue as the next version
 *    (the earlier copy is kept, marked as replaced);
 *  - signed contract: record a dated correction alongside the signed file,
 *    which is never altered, restamped or reworded.
 *
 * Nothing here emails anybody.
 */

import { useMemo, useState } from "react";
import { AlertTriangle, FileText, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { ContractType, ContractVariables } from "@/components/contracts/contractTemplates";
import {
  COMPARED_CONTRACT_FIELDS,
  canReissueContract,
  compareContractDetails,
  isSubstantiveChange,
  needsCorrectionRecord,
} from "@/lib/contract-detail-drift";
import {
  useContractCorrections,
  useCorrectAndReissueContract,
  useHeldContractDetails,
  useRecordContractCorrection,
} from "@/hooks/useContractCorrections";

interface Props {
  contractId: string;
  employeeId: string;
  contractState: string;
  termsSnapshot: Record<string, unknown> | null | undefined;
}

export function ContractDetailDriftPanel({ contractId, employeeId, contractState, termsSnapshot }: Props) {
  const held = useHeldContractDetails(employeeId);
  const { data: corrections = [] } = useContractCorrections(contractId);
  const reissue = useCorrectAndReissueContract();
  const recordCorrection = useRecordContractCorrection();

  const [editOpen, setEditOpen] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});

  const onContract = useMemo(
    () => ((termsSnapshot?.variables as Partial<ContractVariables> | undefined) ?? {}),
    [termsSnapshot],
  );
  const contractType = ((termsSnapshot?.contract_type as ContractType | undefined) ??
    held.data?.contractType ??
    "foh") as ContractType;

  const drifts = useMemo(
    () => compareContractDetails(onContract, held.data?.variables),
    [onContract, held.data?.variables],
  );

  const editable = canReissueContract(contractState);
  const signed = needsCorrectionRecord(contractState);

  const openEdit = () => {
    const next: Record<string, string> = {};
    for (const { key } of COMPARED_CONTRACT_FIELDS) {
      const onFile = held.data?.variables?.[key];
      const current = onContract[key];
      next[key as string] = String((onFile ?? current ?? "") as string | number);
    }
    setDraft(next);
    setReason("");
    setEditOpen(true);
  };

  const handleReissue = async () => {
    if (!reason.trim()) {
      toast.error("Please say why this contract is being corrected");
      return;
    }
    const merged: Record<string, unknown> = { ...onContract };
    const changes: { field: string; label: string; previous: string; next: string }[] = [];
    for (const { key, label } of COMPARED_CONTRACT_FIELDS) {
      const value = (draft[key as string] ?? "").trim();
      const previous = String((onContract[key] ?? "") as string | number).trim();
      if (!value) continue;
      merged[key as string] =
        key === "weeklyHours" || key === "baseHourlyRate" ? Number(value) : value;
      if (value !== previous) changes.push({ field: key as string, label, previous, next: value });
    }
    if (!changes.length) {
      toast.error("Nothing has been changed");
      return;
    }
    try {
      await reissue.mutateAsync({
        contractId,
        variables: merged as unknown as ContractVariables,
        contractType,
        reason: reason.trim(),
        changes,
      });
      setEditOpen(false);
      toast.success("Corrected copy produced. Nothing was sent — send it when you are ready.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not produce the corrected copy");
    }
  };

  const handleRecordCorrections = async () => {
    if (!reason.trim()) {
      toast.error("Please say why this is being corrected");
      return;
    }
    try {
      for (const d of drifts) {
        await recordCorrection.mutateAsync({
          contractId,
          employeeId,
          field: d.field as string,
          label: d.label,
          previousValue: d.onContract,
          newValue: d.onFile,
          reason: reason.trim(),
        });
      }
      setCorrectionOpen(false);
      setReason("");
      toast.success("Correction recorded. The signed document is unchanged.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not record the correction");
    }
  };

  if (!drifts.length && !corrections.length) return null;

  const substantive = drifts.filter((d) => isSubstantiveChange(d.field as string));

  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/70 p-3">
      {drifts.length > 0 && (
        <>
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-amber-900">
                This contract no longer matches the details we hold
              </p>
              <ul className="mt-1.5 space-y-1">
                {drifts.map((d) => (
                  <li key={d.field as string} className="text-xs text-amber-900 break-words">
                    <span className="font-medium">{d.label}:</span> contract says “
                    {d.onContract || "blank"}”, record says “{d.onFile}”
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {editable ? (
              <Button size="sm" variant="outline" className="h-8" onClick={openEdit}>
                <PencilLine className="mr-1.5 h-3.5 w-3.5" />
                Correct details and reissue
              </Button>
            ) : signed ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => {
                  setReason("");
                  setCorrectionOpen(true);
                }}
              >
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                Record a dated correction
              </Button>
            ) : (
              <p className="text-xs text-amber-900">
                This document is kept exactly as it is. No change can be made to it.
              </p>
            )}
          </div>

          {signed && substantive.length > 0 && (
            <p className="mt-2 text-xs text-amber-900">
              {substantive.map((d) => d.label).join(", ")} affect the agreed terms. A correction note is not
              enough — these need a dated signed variation.
            </p>
          )}
        </>
      )}

      {corrections.length > 0 && (
        <div className={drifts.length ? "mt-3 border-t border-amber-200 pt-2" : ""}>
          <p className="text-xs font-semibold text-amber-900">Recorded corrections</p>
          <ul className="mt-1 space-y-1">
            {corrections.map((c: Record<string, unknown>) => (
              <li key={c.id as string} className="text-xs text-amber-900 break-words">
                {new Date(c.corrected_on as string).toLocaleDateString("en-GB")} — {c.label as string}: “
                {(c.previous_value as string) || "blank"}” corrected to “{c.new_value as string}” (
                {c.reason as string})
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Correct an unsigned contract and reissue it */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Correct contract details</DialogTitle>
            <DialogDescription>
              A fresh copy is produced with these details. The earlier copy is kept in the history, marked as
              replaced. Nothing is sent until you choose to send it.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
            {COMPARED_CONTRACT_FIELDS.map(({ key, label }) => {
              const onFile = held.data?.variables?.[key];
              return (
                <div key={key as string} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  <Input
                    className="h-9 text-sm"
                    value={draft[key as string] ?? ""}
                    onChange={(e) => setDraft((p) => ({ ...p, [key as string]: e.target.value }))}
                  />
                  {onFile !== undefined && onFile !== null && String(onFile).trim() !== "" && (
                    <p className="text-[10px] text-muted-foreground">On file: {String(onFile)}</p>
                  )}
                </div>
              );
            })}
            <div className="space-y-1">
              <Label className="text-xs">Why is this being corrected?</Label>
              <Textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. name was misspelled when the contract was produced"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReissue} disabled={reissue.isPending}>
              {reissue.isPending ? "Producing…" : "Produce corrected copy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record a correction against a signed contract */}
      <Dialog open={correctionOpen} onOpenChange={setCorrectionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record a dated correction</DialogTitle>
            <DialogDescription>
              The signed contract is not altered in any way. This adds a dated note recording the correct
              details alongside it.
            </DialogDescription>
          </DialogHeader>

          <ul className="space-y-1 text-sm">
            {drifts.map((d) => (
              <li key={d.field as string} className="break-words">
                <span className="font-medium">{d.label}:</span> “{d.onContract || "blank"}” → “{d.onFile}”
              </li>
            ))}
          </ul>

          <div className="space-y-1">
            <Label className="text-xs">Why is this being corrected?</Label>
            <Textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. employee's surname was recorded incorrectly"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setCorrectionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordCorrections} disabled={recordCorrection.isPending}>
              {recordCorrection.isPending ? "Recording…" : "Record correction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
