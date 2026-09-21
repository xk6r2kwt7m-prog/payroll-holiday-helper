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
import { ALL_SITES_BRANCH, isGroupReadyToSend, isReadyToSend, type LicenceSite } from "@/lib/licensing-documents";
import { usePremisesLicences } from "@/hooks/usePremisesLicences";
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
  open, onOpenChange, initialBranch, initialEmployeeId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Opens with this site already chosen. */
  initialBranch?: string;
  /** Opens with only this person ticked — used by the per-person button. */
  initialEmployeeId?: string;
}) {
  const { data: branchData } = useComplianceBranches();
  const branches = branchData?.selectable ?? [];
  const [branch, setBranch] = useState(initialBranch ?? "");
  const [selected, setSelected] = useState<string[]>([]);
  const [testSend, setTestSend] = useState(false);
  const [showEveryone, setShowEveryone] = useState(!!initialEmployeeId);
  const [busy, setBusy] = useState(false);
  // Nothing is ever sent from the first step — the recipient list must be
  // confirmed on the second step first.
  const [step, setStep] = useState<"choose" | "confirm">("choose");

  // Sites come from employee_branches — there is no branch column on employees.
  const employees = useEmployeesWithBranches();
  const { data: decisions = [] } = useAlcoholListDecisions();
  const allSites = branch === ALL_SITES_BRANCH;
  const { data: licence } = usePremisesLicence(allSites ? undefined : (branch || undefined));
  const { data: allLicences = [] } = usePremisesLicences();
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

  // Every site's licence details must be confirmed before one signature can
  // stand for someone who works across more than one of them.
  const licenceSites: LicenceSite[] = useMemo(
    () => (allLicences as any[]).filter((l) => !!l.branch).map((l) => ({
      branch: l.branch,
      premises_name: l.premises_name,
      premises_address: l.premises_address,
      licence_number: l.licence_number,
      licence_holder: l.licence_holder,
      issuing_authority: l.issuing_authority,
      dps_name: l.dps_name,
      dps_personal_licence_number: l.dps_personal_licence_number,
    })),
    [allLicences],
  );
  const licencedBranches = useMemo(
    () => licenceSites.map((s) => s.branch.trim().toLowerCase()),
    [licenceSites],
  );
  const ready = allSites
    ? licenceSites.length > 0 && isGroupReadyToSend(licenceSites)
    : !!licence && isReadyToSend(site, "staff_alcohol");

  const staff = useMemo(
    () => (employees as any[])
      .filter((e) => !e.archived_at && e.status !== "leaver" && !e.is_test_record)
      .filter((e) => !branch || allSites || (e.branches ?? []).some(
        (b: string) => (b ?? "").trim().toLowerCase() === branch.trim().toLowerCase()))
      // Same rule as the site alcohol list, including your own decisions, so a
      // person can never appear on one and not the other.
      .filter((e) => showEveryone || (allSites
        ? (e.branches ?? []).some((b: string) => belongsOnAlcoholList(e as any, b, decisions as any))
        : belongsOnAlcoholList(e as any, branch, decisions as any)))
      .map((e) => ({
        ...e,
        // The sites this one signature will cover for this person.
        coveredBranches: ((e.branches ?? []) as string[])
          .filter((b) => licencedBranches.includes((b ?? "").trim().toLowerCase())),
        state: alcoholAskState(e.id, requests as any[], authorisations as any[]),
        needsAsk: needsAlcoholAsk(e as any, requests as any[], authorisations as any[]),
      }))
      .sort((a, b) => `${a.forename} ${a.surname}`.localeCompare(`${b.forename} ${b.surname}`)),
    [employees, branch, allSites, showEveryone, requests, authorisations, decisions, licencedBranches]
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
    if (!allSites && !licence) { toast.error("Add this site's premises licence details first"); return; }
    if (chosen.length === 0) { toast.error("Choose at least one person with an email address"); return; }
    setStep("confirm");
  };

  const submit = async () => {
    if (!branch) { toast.error("Choose the site"); return; }
    if (!allSites && !licence) { toast.error("Add this site's premises licence details first"); return; }
    if (step !== "confirm") { review(); return; }
    if (chosen.length === 0) { toast.error("Choose at least one person with an email address"); return; }
    setBusy(true);
    try {
      const res = await send.mutateAsync({
        subject_type: "staff_alcohol",
        branch,
        licence_id: allSites ? null : licence?.id ?? null,
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

        {step === "confirm" ? (
          <div className="space-y-3">
            <p className="text-sm">
              {testSend
                ? `A test copy comes to you only. Nothing reaches these ${chosen.length} people.`
                : `This will email ${chosen.length} ${chosen.length === 1 ? "person" : "people"}${allSites ? " across every site" : ` at ${branch}`}. Check the names and addresses below.`}
            </p>
            <div className="rounded-lg border border-border divide-y divide-border max-h-60 overflow-y-auto">
              {chosen.map((e) => (
                <div key={e.id} className="px-3 py-2">
                  <p className="text-sm truncate">
                    {e.forename} {e.surname}
                    {e.department ? <span className="text-muted-foreground"> · {e.department}</span> : null}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{e.email}</p>
                  {e.coveredBranches.length > 1 && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      Covers {e.coveredBranches.join(" and ")} — they sign once
                    </p>
                  )}
                </div>
              ))}
            </div>
            {noEmail.length > 0 && (
              <div className="rounded-lg border border-warning/40 bg-warning/5 p-2.5 space-y-1">
                <p className="text-xs font-medium text-warning">
                  Cannot be sent — no email address on file ({noEmail.length})
                </p>
                {noEmail.map((e) => (
                  <p key={e.id} className="text-xs text-muted-foreground truncate">
                    {e.forename} {e.surname}
                  </p>
                ))}
              </div>
            )}
          </div>
        ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Site</Label>
            <Select value={branch} onValueChange={(v) => { setBranch(v); setSelected([]); }}>
              <SelectTrigger><SelectValue placeholder="Choose site" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SITES_BRANCH}>All sites</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.branch}>{b.display_name || b.branch}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {branch && !ready && (
            <p className="text-xs text-warning">
              {allSites
                ? "Record every site's premises licence details in Branch compliance before sending — one signature has to name each licence it covers."
                : "Record this site's premises licence details in Branch compliance before sending — the document names the licence and the licence holder."}
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
                  ? (allSites ? "Everyone with an email address." : "Everyone at this site with an email address.")
                  : "Front-of-house roles are shown. Turn on \u201cShow everyone\u201d for kitchen and other roles."}
              </p>
              {staff.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nobody to show. Turn on "Show everyone" if job titles are not filled in.
                </p>
              ) : (
                <div className="rounded-lg border border-border divide-y divide-border max-h-60 overflow-y-auto">
                  {staff.map((e) => (
                    <label key={e.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer">
                      <Checkbox
                        checked={selected.includes(e.id)}
                        disabled={!e.email}
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
                          {e.email ? alcoholAskStateLabel(e.state) : "Cannot be sent — no email address on file"}
                        </span>
                        {e.coveredBranches.length > 1 && (
                          <span className="block text-[11px] text-muted-foreground truncate">
                            One signature covers {e.coveredBranches.join(" and ")}
                          </span>
                        )}
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
        )}

        <DialogFooter>
          {step === "confirm" ? (
            <>
              <Button variant="outline" onClick={() => setStep("choose")} disabled={busy}>Back</Button>
              <Button onClick={submit} disabled={busy || !ready || chosen.length === 0}>
                {busy ? "Sending..." : `Send to these ${chosen.length} ${chosen.length === 1 ? "person" : "people"}`}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={review} disabled={!ready || chosen.length === 0}>
                Review who it goes to
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
