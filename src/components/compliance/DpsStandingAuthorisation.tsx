import { useMemo, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Download, PenLine, Send, ShieldCheck, Eye, Link2 } from "lucide-react";
import {
  usePremisesLicences, useSendLicenceSignature, useLicenceSignatureRequests,
  useSavePremisesLicence,
} from "@/hooks/usePremisesLicences";
import {
  ALL_SITES_BRANCH, buildDpsAuthorisationAllSites, siteReadiness, isLiveDpsSignature,
  resolveRequestStatus, requestStatusLabel, type LicenceSite,
} from "@/lib/licensing-documents";

import { LicensingDocumentPDF } from "@/components/compliance/LicensingDocumentPDF";

/**
 * One signature from the Designated Premises Supervisor covering every site.
 *
 * It is a standing authorisation: once signed it keeps applying as front-of-house
 * people join or leave. Reading is always allowed — only sending waits on the
 * licence details being confirmed, and nothing is emailed until the manager
 * presses Send and confirms.
 */
export function DpsStandingAuthorisation() {
  const { data: licences = [] } = usePremisesLicences();
  const { data: requests = [] } = useLicenceSignatureRequests({ subjectType: "dps_authorisation" });
  const send = useSendLicenceSignature();
  const saveLicence = useSavePremisesLicence();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"details" | "confirm">("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [expiryDays, setExpiryDays] = useState(30);
  const [testSend, setTestSend] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  /** Which sites this request covers. Only sites with confirmed details can be chosen. */
  const [chosen, setChosen] = useState<string[]>([]);


  const sites: LicenceSite[] = useMemo(
    () => (licences as any[])
      .filter((l) => !!l.branch)
      .sort((a, b) => a.branch.localeCompare(b.branch))
      .map((l) => ({
        branch: l.branch,
        premises_name: l.premises_name,
        premises_address: l.premises_address,
        licence_number: l.licence_number,
        licence_holder: l.licence_holder,
        issuing_authority: l.issuing_authority,
        dps_name: l.dps_name,
        dps_personal_licence_number: l.dps_personal_licence_number,
      })),
    [licences],
  );

  const readiness = useMemo(() => siteReadiness(sites), [sites]);
  const eligible = readiness.filter((r) => r.ready);
  const waiting = readiness.filter((r) => !r.ready);

  /** The sites actually covered by this request: chosen, and confirmed. */
  const coveredSites = useMemo(
    () => eligible.filter((r) => chosen.includes(r.branch)).map((r) => r.site),
    [eligible, chosen],
  );
  const ready = coveredSites.length > 0;

  const allSiteRequests = (requests as any[])
    .filter((r) => r.branch === ALL_SITES_BRANCH && r.status !== "cancelled" && !r.is_test_record);
  // Only a real signature counts — test copies and voided requests never do.
  const signed = allSiteRequests.find((r) => isLiveDpsSignature(r));
  const latest = allSiteRequests[0] ?? null;
  const status = latest ? resolveRequestStatus(latest) : null;
  /** The open request he still has to sign — used for the copyable link. */
  const awaitingSignature = allSiteRequests.find((r) => !r.signed_at && r.token);
  const signingLink = awaitingSignature
    ? `https://udp.lovable.app/sign-licence/${awaitingSignature.token}`
    : null;

  const copyLink = async () => {
    if (!signingLink) return;
    try {
      await navigator.clipboard.writeText(signingLink);
      toast.success("Signing link copied. Nothing was emailed.");
    } catch {
      toast.error("Could not copy the link — select and copy it by hand.");
    }
  };

  const doc = useMemo(
    () => buildDpsAuthorisationAllSites(coveredSites.length > 0 ? coveredSites : sites, null),
    [coveredSites, sites],
  );
  const siteNames = (coveredSites.length > 0 ? coveredSites : sites).map((s) => s.branch).join(", ");
  const savedEmail = (licences as any[]).find((l) => (l.dps_email ?? "").trim())?.dps_email ?? "";
  const defaultName = sites.find((s) => (s.dps_name ?? "").trim())?.dps_name ?? "";

  const toggleSite = (branch: string) =>
    setChosen((prev) => prev.includes(branch) ? prev.filter((b) => b !== branch) : [...prev, branch]);

  const start = () => {
    setName(defaultName);
    setEmail(savedEmail);
    setExpiryDays(30);
    setTestSend(false);
    setChosen(eligible.map((r) => r.branch));
    setStep("details");
    setOpen(true);
  };


  const expiryDate = new Date(Date.now() + expiryDays * 86400000).toLocaleDateString("en-GB");
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  /** Saves his address against every site so it is filled in next time. Sends nothing. */
  const saveEmail = async () => {
    if (!emailValid) { toast.error("Enter a valid email address"); return; }
    setSavingEmail(true);
    try {
      for (const l of licences as any[]) {
        if (!l.branch) continue;
        await saveLicence.mutateAsync({ id: l.id, branch: l.branch, dps_email: email.trim() });
      }
      toast.success("His email address is saved. Nothing was sent.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingEmail(false);
    }
  };

  const submit = async () => {
    if (step === "details") { setStep("confirm"); return; }
    if (!ready) { toast.error("Choose at least one site whose licence details are confirmed"); return; }
    if (!name.trim()) { toast.error("Enter his name"); return; }
    if (!emailValid) { toast.error("Enter a valid email address"); return; }
    setBusy(true);
    try {
      const res = await send.mutateAsync({
        subject_type: "dps_authorisation",
        all_sites: true,
        branches: coveredSites.map((s) => s.branch),
        branch: ALL_SITES_BRANCH,

        recipient_name: name.trim(),
        recipient_email: email.trim(),
        recipient_role: "Designated Premises Supervisor",
        expiry_days: expiryDays,
        test_send: testSend,
      });
      if (res.failed?.length) toast.error(res.failed.join("; "));
      if ((res.sent ?? 0) > 0) {
        toast.success(testSend ? "Test copy sent to you" : "Sent for signature");
        setOpen(false);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    const signedDoc = signed?.document_body ?? doc;
    const blob = await pdf(
      <LicensingDocumentPDF
        doc={signedDoc as any}
        staff={[]}
        showStaffRegister={false}
        authoriserSignature={signed?.signature ?? null}
        authoriserSignedAt={signed?.signed_at ?? null}
        auditLine={signed
          ? `Signed electronically by ${signed.signer_name} on ${new Date(signed.signed_at).toLocaleString("en-GB")}. Recorded in UglyOps HR.`
          : "Not yet signed — this is a draft copy."}
      />
    ).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dps-authorisation-all-sites.pdf";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-lg border p-3 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0" />
            Designated Premises Supervisor — one signature, all sites
          </p>
          <p className="text-[11px] text-muted-foreground">
            {signed
              ? `Signed by ${signed.signer_name} on ${new Date(signed.signed_at).toLocaleDateString("en-GB")}. Standing authorisation — it keeps applying as people join or leave.`
              : latest
                ? `Sent to ${latest.recipient_name} — not signed yet.`
                : "Not requested yet. He signs once and it covers every site."}
          </p>
          {eligible.length > 0 && (
            <p className="text-[11px] text-muted-foreground">
              Ready to send for {eligible.map((r) => r.branch).join(", ")}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground">
            {savedEmail
              ? `His email on file: ${savedEmail}`
              : "No email address on file — add it when you review."}
          </p>
        </div>
        {status && (
          <Badge className="text-[10px] shrink-0" variant={signed ? "default" : "secondary"}>
            {requestStatusLabel(status)}
          </Badge>
        )}
      </div>

      {waiting.length > 0 && (
        <div className="space-y-1">
          {waiting.map((r) => (
            <p key={r.branch} className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{r.branch}</span> is not included yet —
              still to confirm: {r.missing.join("; ")}.
            </p>
          ))}
        </div>
      )}


      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={start} disabled={sites.length === 0}>
          <Eye className="h-3.5 w-3.5 mr-1.5" />
          {signed ? "Review or request a fresh signature" : "Review the authorisation"}
        </Button>
        <Button size="sm" variant="outline" onClick={download} disabled={sites.length === 0}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> Download the authorisation
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[calc(100dvh-1rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <PenLine className="h-4 w-4 inline mr-1.5" /> The DPS authorisation
            </DialogTitle>
            <DialogDescription>
              Read it here in full. It authorises front-of-house staff to sell alcohol at {siteNames}.
              Nothing is sent until you press Send and confirm.
            </DialogDescription>
          </DialogHeader>

          {step === "details" ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Sites this signature covers</Label>
                <div className="rounded-md border divide-y">
                  {readiness.map((r) => (
                    <label
                      key={r.branch}
                      className={cn(
                        "flex items-start gap-2.5 p-2.5",
                        r.ready ? "cursor-pointer" : "opacity-70",
                      )}
                    >
                      <Checkbox
                        checked={r.ready && chosen.includes(r.branch)}
                        disabled={!r.ready}
                        onCheckedChange={() => r.ready && toggleSite(r.branch)}
                        className="mt-0.5"
                      />
                      <span className="min-w-0 text-xs">
                        <span className="font-medium">{r.branch}</span>
                        <span className="block text-[11px] text-muted-foreground">
                          {r.ready
                            ? "Licence details confirmed — can be included."
                            : `Waiting on: ${r.missing.join("; ")}.`}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Only sites with confirmed licence details can be included. The others stay out
                  until their details are filled in — they do not hold the rest back.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>His name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label>His email address</Label>
                <div className="flex gap-2">
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <Button
                    variant="outline"
                    onClick={saveEmail}
                    disabled={savingEmail || !emailValid || email.trim() === savedEmail}
                  >
                    Save
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Saving keeps it with all three sites' licence details for next time. Saving sends
                  nothing.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Link stays open for</Label>
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(Number(e.target.value) || 30)}
                />
                <p className="text-[11px] text-muted-foreground">Expires {expiryDate}.</p>
              </div>
              <label className="flex items-center justify-between gap-3 rounded-md border p-2.5">
                <span className="text-xs">
                  Send a test copy to me instead
                  <span className="block text-[11px] text-muted-foreground">Nothing reaches him.</span>
                </span>
                <Switch checked={testSend} onCheckedChange={setTestSend} />
              </label>
              <div className="rounded-md border p-2.5 space-y-1 text-[11px] text-muted-foreground">
                <p className="font-medium text-foreground text-xs">{doc.title}</p>
                {doc.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {!ready && (
                <p className="rounded-md border border-warning/40 bg-warning/5 p-2.5 text-xs text-warning">
                  Choose at least one site whose licence details are confirmed. Go back and tick a
                  site, or fill in the missing licence details for the ones still waiting.
                </p>
              )}
              {waiting.length > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Not included: {waiting.map((r) => r.branch).join(", ")} — their licence details are
                  not confirmed yet.
                </p>
              )}

              <div className="rounded-md border p-2.5 space-y-1 text-xs">
                <p><span className="text-muted-foreground">To:</span> {name} — {email}</p>
                <p><span className="text-muted-foreground">Sites covered:</span> {siteNames}</p>
                <p><span className="text-muted-foreground">Link expires:</span> {expiryDate}</p>
                {testSend && <p className="text-warning">Test copy — it comes to you only.</p>}
              </div>
              <div className="rounded-md border bg-muted/30 p-2.5 space-y-1.5 text-xs">
                <p className="font-medium">Exactly what he receives</p>
                <p className="font-medium">Your signature is needed — authorisation to sell alcohol</p>
                <p>Hi {name.split(" ")[0] || "there"},</p>
                <p>
                  Your manager is asking for your signature as Designated Premises Supervisor on one
                  document only: the written authorisation for front-of-house staff to sell alcohol at{" "}
                  {siteNames}.
                </p>
                <p>
                  It is a standing authorisation, so it keeps applying as people join or leave until it is
                  withdrawn in writing. Please read it in full before signing.
                </p>
                <p className="font-medium">[ Read and sign ]</p>
                <p>
                  You can read it now and sign later — the link stays open for {expiryDays} days. No login
                  is needed. This link is personal to you. Please do not forward it.
                </p>
                <p className="text-muted-foreground">
                  The email also carries the standard footer telling him not to reply to it.
                </p>
              </div>
              <div className="rounded-md border p-2.5 space-y-1 text-[11px] text-muted-foreground">
                <p className="font-medium text-foreground text-xs">{doc.title}</p>
                {doc.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {step === "confirm" && (
              <Button variant="ghost" onClick={() => setStep("details")} disabled={busy}>Back</Button>
            )}
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Close</Button>
            <Button onClick={submit} disabled={busy || (step === "confirm" && !ready)}>
              {step === "details"
                ? "Next — see the email"
                : testSend ? "Send test to me" : "Send for signature"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
