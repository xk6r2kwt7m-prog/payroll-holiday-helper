import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Wine, ShieldCheck, ShieldOff } from "lucide-react";
import { useAlcoholAuthorisations, useUpdateAlcoholAuthorisation } from "@/hooks/useCompliance";
import {
  resolveAuthorisationStatus, authorisationLabel, authorisationTone,
  canApproveAuthorisation, APPROVER_ROLES,
} from "@/lib/alcohol-authorisation-status";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const toneClass: Record<string, string> = {
  red: "bg-destructive/10 text-destructive",
  amber: "bg-warning/10 text-warning",
  green: "bg-success/10 text-success",
  grey: "bg-muted text-muted-foreground",
};

export function AlcoholAuthorisationsPanel({ employeeId }: { employeeId?: string }) {
  const { data: records = [], isLoading } = useAlcoholAuthorisations(employeeId);
  const update = useUpdateAlcoholAuthorisation();
  const { role } = useAuth();

  const [approving, setApproving] = useState<any | null>(null);
  const [authoriserName, setAuthoriserName] = useState("");
  const [authoriserRole, setAuthoriserRole] = useState<string>(APPROVER_ROLES[0]);
  const [licenceNumber, setLicenceNumber] = useState("");
  const [revoking, setRevoking] = useState<any | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [busy, setBusy] = useState(false);

  const mayApprove = canApproveAuthorisation(role ?? undefined, authoriserRole as any);

  const approve = async () => {
    if (!authoriserName.trim()) { toast.error("Enter the name of the licence holder or DPS approving this"); return; }
    if (!mayApprove) { toast.error("Only an admin or manager acting as DPS or personal licence holder can approve this"); return; }
    setBusy(true);
    try {
      await update.mutateAsync({
        id: approving.id,
        updates: {
          authoriser_name: authoriserName,
          authoriser_role: authoriserRole,
          authoriser_licence_number: licenceNumber || null,
          authoriser_confirmed_at: new Date().toISOString(),
          authorised_at: new Date().toISOString(),
          status: "active",
        },
      });
      toast.success("Authorisation approved");
      setApproving(null); setAuthoriserName(""); setLicenceNumber("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    if (!revokeReason.trim()) { toast.error("Give a reason — it is kept on the record"); return; }
    setBusy(true);
    try {
      await update.mutateAsync({
        id: revoking.id,
        updates: { status: "revoked", revoked_at: new Date().toISOString(), revoked_reason: revokeReason },
      });
      toast.success("Authorisation revoked — the record is kept");
      setRevoking(null); setRevokeReason("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground py-6 text-center">Loading...</p>;

  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center">
        <Wine className="h-7 w-7 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm font-medium">No alcohol-sales authorisations yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Include alcohol sales in an induction and the authorisation record is created automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {(records as any[]).map(r => {
          const emp = r.employees;
          const subject = emp ? { status: emp.status, archived_at: emp.archived_at } : undefined;
          const effective = resolveAuthorisationStatus(r, subject);
          return (
            <div key={r.id} className="px-4 py-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {emp ? `${emp.forename} ${emp.surname}` : "Staff member"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.branch || "No branch"}
                    {r.authoriser_name ? ` · approved by ${r.authoriser_name}` : ""}
                    {r.authorised_at ? ` · ${new Date(r.authorised_at).toLocaleDateString("en-GB")}` : ""}
                  </p>
                  {r.revoked_reason && (
                    <p className="text-xs text-destructive mt-0.5">Revoked: {r.revoked_reason}</p>
                  )}
                </div>
                <Badge className={cn("text-[10px] shrink-0", toneClass[authorisationTone(effective)])}>
                  {authorisationLabel(effective)}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {effective === "pending" && (
                  <Button size="sm" onClick={() => setApproving(r)}>
                    <ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Approve authorisation
                  </Button>
                )}
                {effective === "active" && (
                  <Button size="sm" variant="outline" onClick={() => setRevoking(r)}>
                    <ShieldOff className="h-3.5 w-3.5 mr-1.5" /> Revoke
                  </Button>
                )}
                {!r.employee_signed_at && (
                  <span className="text-xs text-muted-foreground self-center">Waiting for the staff signature</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!approving} onOpenChange={(o) => !o && setApproving(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Approve alcohol-sales authorisation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Approving as</Label>
              <Select value={authoriserRole} onValueChange={setAuthoriserRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dps">Designated Premises Supervisor</SelectItem>
                  <SelectItem value="personal_licence_holder">Personal licence holder</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Your name</Label>
              <Input value={authoriserName} onChange={(e) => setAuthoriserName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Personal licence number (optional)</Label>
              <Input value={licenceNumber} onChange={(e) => setLicenceNumber(e.target.value)} />
            </div>
            {!mayApprove && (
              <p className="text-xs text-destructive">
                You do not have permission to approve alcohol-sales authorisations.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproving(null)}>Cancel</Button>
            <Button onClick={approve} disabled={busy || !mayApprove}>{busy ? "Saving..." : "Approve"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!revoking} onOpenChange={(o) => !o && setRevoking(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Revoke authorisation</DialogTitle></DialogHeader>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea rows={3} value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevoking(null)}>Cancel</Button>
            <Button variant="destructive" onClick={revoke} disabled={busy}>{busy ? "Saving..." : "Revoke"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
