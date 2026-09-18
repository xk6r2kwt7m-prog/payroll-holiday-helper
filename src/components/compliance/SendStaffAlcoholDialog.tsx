import { useEffect, useMemo, useState } from "react";
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
import { useEmployeesWithBranches } from "@/hooks/useDpsRegister";
import { useComplianceBranches } from "@/hooks/useComplianceBranches";
import { usePremisesLicence, useSendLicenceSignature, useLicenceSignatureRequests } from "@/hooks/usePremisesLicences";
import { useAlcoholAuthorisations } from "@/hooks/useCompliance";
import { isReadyToSend } from "@/lib/licensing-documents";
import {
  belongsOnAlcoholList, alcoholAskState, alcoholAskStateLabel, needsAlcoholAsk,
} from "@/lib/alcohol-automation";
import { useAlcoholListDecisions } from "@/hooks/useDpsRegister";

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
  const [showEveryone, setShowEveryone] = useState(false);
  const [busy, setBusy] = useState(false);
  // Nothing is ever sent from the first step — the recipient list must be
  // confirmed on the second step first.
  const [step, setStep] = useState<"choose" | "confirm">("choose");

  // Sites come from employee_branches — there is no branch column on employees.
  const employees = useEmployeesWithBranches();
  const { data: decisions = [] } = useAlcoholListDecisions();
  const { data: licence } = usePremisesLicence(branch || undefined);
  const { data: requests = [] } = useLicenceSignatureRequests({ subjectType: "staff_alcohol" });
  const { data: authorisations = [] } = useAlcoholAuthorisations();
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
      .filter((e) => !branch || (e.branches ?? []).some(
        (b: string) => (b ?? "").trim().toLowerCase() === branch.trim().toLowerCase()))
      // Same rule as the site alcohol list, including your own decisions, so a
      // person can never appear on one and not the other.
      .filter((e) => showEveryone || belongsOnAlcoholList(e as any, branch, decisions as any))
      .map((e) => ({
        ...e,
        state: alcoholAskState(e.id, requests as any[], authorisations as any[]),
        needsAsk: needsAlcoholAsk(e as any, requests as any[], authorisations as any[]),
      }))
      .sort((a, b) => `${a.forename} ${a.surname}`.localeCompare(`${b.forename} ${b.surname}`)),
    [employees, branch, showEveryone, requests, authorisations, decisions]
  );

  const missing = staff.filter((e) => e.needsAsk && !!e.email);
  const noEmail = staff.filter((e) => !e.email);
  const chosen = staff.filter((e) => selected.includes(e.id) && !!e.email);

  // Everyone who still needs it is ticked for you when you pick a site.
  useEffect(() => {
    if (!branch) return;
    setStep("choose");
    setSelected(missing.map((e) => e.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch, showEveryone, staff.length]);

  const review = () => {
    if (!branch) { toast.error("Choose the site"); return; }
    if (!licence) { toast.error("Add this site's premises licence details first"); return; }
    if (chosen.length === 0) { toast.error("Choose at least one person with an email address"); return; }
    setStep("confirm");
  };

  const submit = async () => {
    if (!branch) { toast.error("Choose the site"); return; }
    if (!licence) { toast.error("Add this site's premises licence details first"); return; }
    if (step !== "confirm") { review(); return; }
    if (chosen.length === 0) { toast.error("Choose at least one person with an email address"); return; }
    setBusy(true);
    try {
      const res = await send.mutateAsync({
        subject_type: "staff_alcohol",
        branch,
        licence_id: licence.id,
        recipient_name: "",
        recipient_email: "",
        employee_ids: chosen.map((e) => e.id),
        test_send: testSend,
      });
      if (res.failed?.length) toast.error(res.failed.join("; "));
      const count = res.sent ?? 0;
      if (count > 0) {
        toast.success(
          testSend
            ? `Test copy sent to you for ${count} ${count === 1 ? "person" : "people"}`
            : `Sent to ${count} ${count === 1 ? "person" : "people"}`
        );
        onOpenChange(false);
        setSelected([]);
        setStep("choose");
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
              <div className="flex items-center justify-between gap-2">
                <Label>Who is it for?</Label>
                {missing.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setSelected(missing.map((e) => e.id))}
                  >
                    Tick everyone who still needs it ({missing.length})
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {showEveryone
                  ? "Everyone at this site with an email address."
                  : "Front-of-house roles are shown. Turn on \u201cShow everyone\u201d for kitchen and other roles."}
              </p>
              {staff.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nobody to show at this site. Turn on "Show everyone" if job titles are not filled in.
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
                        <span className="block truncate">
                          {e.forename} {e.surname}
                          {e.department ? <span className="text-muted-foreground"> · {e.department}</span> : null}
                        </span>
                        <span className="block text-xs text-muted-foreground truncate">
                          {alcoholAskStateLabel(e.state)}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {branch && (
            <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
              <span className="text-sm">
                Show everyone, not only front of house
                <span className="block text-xs text-muted-foreground">Useful when job titles are missing</span>
              </span>
              <Switch checked={showEveryone} onCheckedChange={setShowEveryone} />
            </label>
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
            {busy ? "Sending..." : `Send${selected.length ? ` to ${selected.length}` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
