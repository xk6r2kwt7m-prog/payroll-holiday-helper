import { useMemo, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Download, PenLine, Send, ShieldCheck } from "lucide-react";
import { usePremisesLicences, useSendLicenceSignature, useLicenceSignatureRequests } from "@/hooks/usePremisesLicences";
import {
  ALL_SITES_BRANCH, buildDpsAuthorisationAllSites, groupAwaitingConfirmation, isGroupReadyToSend,
  resolveRequestStatus, requestStatusLabel, type LicenceSite,
} from "@/lib/licensing-documents";
import { LicensingDocumentPDF } from "@/components/compliance/LicensingDocumentPDF";

/**
 * One signature from the Designated Premises Supervisor covering every site.
 *
 * It is a standing authorisation: once signed it keeps applying as front-of-house
 * people join or leave. Nothing is emailed until the manager presses Send and
 * confirms, and no existing per-site document or record is touched.
 */
export function DpsStandingAuthorisation() {
  const { data: licences = [] } = usePremisesLicences();
  const { data: requests = [] } = useLicenceSignatureRequests({ subjectType: "dps_authorisation" });
  const send = useSendLicenceSignature();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"details" | "confirm">("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [expiryDays, setExpiryDays] = useState(30);
  const [testSend, setTestSend] = useState(false);
  const [busy, setBusy] = useState(false);

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

  const outstanding = groupAwaitingConfirmation(sites);
  const ready = isGroupReadyToSend(sites);

  const allSiteRequests = (requests as any[]).filter((r) => r.branch === ALL_SITES_BRANCH);
  const signed = allSiteRequests.find((r) => r.signed_at);
  const latest = allSiteRequests[0] ?? null;
  const status = latest ? resolveRequestStatus(latest) : null;

  const doc = useMemo(() => buildDpsAuthorisationAllSites(sites, null), [sites]);
  const siteNames = sites.map((s) => s.branch).join(", ");
  const defaultEmail = (licences as any[]).find((l) => (l.dps_email ?? "").trim())?.dps_email ?? "";
  const defaultName = sites.find((s) => (s.dps_name ?? "").trim())?.dps_name ?? "";

  const start = () => {
    setName(defaultName);
    setEmail(defaultEmail);
    setExpiryDays(30);
    setTestSend(false);
    setStep("details");
    setOpen(true);
  };

  const expiryDate = new Date(Date.now() + expiryDays * 86400000).toLocaleDateString("en-GB");

  const submit = async () => {
    if (!name.trim()) { toast.error("Enter his name"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { toast.error("Enter a valid email address"); return; }
    if (step === "details") { setStep("confirm"); return; }
    setBusy(true);
    try {
      const res = await send.mutateAsync({
        subject_type: "dps_authorisation",
        all_sites: true,
        branches: sites.map((s) => s.branch),
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
          {sites.length > 0 && (
            <p className="text-[11px] text-muted-foreground">Covers {siteNames}</p>
          )}
        </div>
        {status && (
          <Badge className="text-[10px] shrink-0" variant={signed ? "default" : "secondary"}>
            {requestStatusLabel(status)}
          </Badge>
        )}
      </div>

      {!ready && sites.length > 0 && (
        <p className="text-xs text-warning">
          Confirm these licence details before asking for his signature: {outstanding.join("; ")}.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={start} disabled={!ready}>
          <Send className="h-3.5 w-3.5 mr-1.5" />
          {signed ? "Request a fresh signature" : "Request his signature"}
        </Button>
        <Button size="sm" variant="outline" onClick={download} disabled={sites.length === 0}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> Download the authorisation
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[calc(100dvh-1rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <PenLine className="h-4 w-4 inline mr-1.5" /> Request the DPS signature
            </DialogTitle>
            <DialogDescription>
              This asks for one signature, for this one purpose: authorising front-of-house staff to
              sell alcohol at {siteNames}.
            </DialogDescription>
          </DialogHeader>

          {step === "details" ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>His name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>His email address</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                {!defaultEmail && (
                  <p className="text-[11px] text-muted-foreground">
                    Save it with the licence details and it will be filled in next time.
                  </p>
                )}
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
            </div>
          ) : (
            <div className="space-y-3">
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
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={submit} disabled={busy}>
              {step === "details" ? "Review before sending" : testSend ? "Send test to me" : "Send for signature"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
