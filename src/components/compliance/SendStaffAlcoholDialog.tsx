import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Wine } from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees";
import { useComplianceBranches } from "@/hooks/useComplianceBranches";
import { usePremisesLicence, useSendLicenceSignature } from "@/hooks/usePremisesLicences";
import { isReadyToSend } from "@/lib/licensing-documents";

/**
 * Sends the alcohol-sales authorisation to staff on its own — not bundled
 * with the induction. Each person reads it, then signs. Approval by the DPS
 * or personal licence holder is unchanged and still required afterwards.
 */
export function SendStaffAlcoholDialog({
  open, onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: branchData } = useComplianceBranches();
  const branches = branchData?.selectable ?? [];
  const [branch, setBranch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [testSend, setTestSend] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: employees = [] } = useEmployees();
  const { data: licence } = usePremisesLicence(branch || undefined);
  const send = useSendLicenceSignature();

  const site = useMemo(() => ({
    branch,
    premises_name: licence?.premises_name,
    premises_address: licence?.premises_address,
    licence_number: licence?.licence_number,
    licence_holder: licence?.licence_holder,
    issuing_authority: licence?.issuing_authority,
    dps_name: licence?.dps_name,
    dps_personal_licence_number: licence?.dps_personal_licence_number,
  }), [branch, licence]);

  const ready = !!licence && isReadyToSend(site, "staff_alcohol");

  const staff = useMemo(
    () => (employees as any[])
      .filter((e) => !e.archived_at && e.status !== "leaver" && !e.is_test_record)
      .filter((e) => !branch || e.branch === branch)
      .filter((e) => !!e.email)
      .sort((a, b) => `${a.forename} ${a.surname}`.localeCompare(`${b.forename} ${b.surname}`)),
    [employees, branch]
  );

  const submit = async () => {
    if (!branch) { toast.error("Choose the site"); return; }
    if (!licence) { toast.error("Add this site's premises licence details first"); return; }
    if (selected.length === 0) { toast.error("Choose at least one person"); return; }
    setBusy(true);
    try {
      const res = await send.mutateAsync({
        subject_type: "staff_alcohol",
        branch,
        licence_id: licence.id,
        recipient_name: "",
        recipient_email: "",
        employee_ids: selected,
        test_send: testSend,
      });
      if (res.failed?.length) toast.error(res.failed.join("; "));
      if (res.sent?.length) {
        toast.success(
          testSend
            ? `Test copy sent to you for ${res.sent.length} ${res.sent.length === 1 ? "person" : "people"}`
            : `Sent to ${res.sent.length} ${res.sent.length === 1 ? "person" : "people"}`
        );
        onOpenChange(false);
        setSelected([]);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            <Wine className="h-4 w-4 inline mr-1.5" /> Send alcohol-sales authorisation
          </DialogTitle>
          <DialogDescription>
            Each person reads it on their phone and signs. You still approve it afterwards as DPS or
            personal licence holder.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Site</Label>
            <Select value={branch} onValueChange={(v) => { setBranch(v); setSelected([]); }}>
              <SelectTrigger><SelectValue placeholder="Choose site" /></SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.branch}>{b.display_name || b.branch}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {branch && !ready && (
            <p className="text-xs text-warning">
              Record this site's premises licence details in Branch compliance before sending — the document
              names the licence and the licence holder.
            </p>
          )}

          {branch && (
            <div className="space-y-1.5">
              <Label>Who is it for?</Label>
              {staff.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No active staff with an email address at this site.
                </p>
              ) : (
                <div className="rounded-lg border border-border divide-y divide-border max-h-60 overflow-y-auto">
                  {staff.map((e) => (
                    <label key={e.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer">
                      <Checkbox
                        checked={selected.includes(e.id)}
                        onCheckedChange={(v) =>
                          setSelected((s) => (v === true ? [...s, e.id] : s.filter((x) => x !== e.id)))
                        }
                      />
                      <span className="text-sm min-w-0">
                        <span className="block truncate">{e.forename} {e.surname}</span>
                        <span className="block text-xs text-muted-foreground truncate">{e.email}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
            <span className="text-sm">
              Send a test copy to me instead
              <span className="block text-xs text-muted-foreground">Nothing reaches staff</span>
            </span>
            <Switch checked={testSend} onCheckedChange={setTestSend} />
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !ready || selected.length === 0}>
            {busy ? "Sending..." : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
