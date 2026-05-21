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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ShieldAlert } from "lucide-react";
import { useTerminateContract } from "@/hooks/useContractAmendments";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
  contractName: string;
  employeeName: string;
}

export function TerminateContractDialog({ open, onOpenChange, contractId, contractName, employeeName }: Props) {
  const { toast } = useToast();
  const terminate = useTerminateContract();
  const [reason, setReason] = useState("");

  const submit = async () => {
    if (!reason.trim()) {
      toast({ title: "Reason required", description: "Termination must be recorded with a reason.", variant: "destructive" });
      return;
    }
    try {
      await terminate.mutateAsync({ contractId, reason: reason.trim() });
      toast({ title: "Contract terminated", description: "The contract has been marked terminated and is now read-only." });
      setReason("");
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Could not terminate", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Terminate contract
          </DialogTitle>
          <DialogDescription>
            {employeeName} · {contractName}. This action is permanent — the contract becomes read-only.
            The signed PDF and audit trail are preserved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label className="text-xs">Reason for termination</Label>
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Resignation effective 31 May 2026"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={terminate.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={submit} disabled={terminate.isPending}>
            {terminate.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Terminate contract
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
