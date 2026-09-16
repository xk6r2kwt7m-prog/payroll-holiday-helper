import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  AlertCircle, CheckCircle2, ChevronLeft, FileText, Loader2, PenLine, ShieldCheck,
} from "lucide-react";
import { SignaturePad } from "@/components/letters/SignaturePad";
import type { LicensingDocument } from "@/lib/licensing-documents";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/licence-signature-portal`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

interface RequestView {
  id: string;
  subject_type: string;
  document_title: string;
  document: LicensingDocument;
  recipient_name: string;
  recipient_role: string | null;
  branch: string | null;
  status: string;
  read_at: string | null;
  signed_at: string | null;
  signer_name: string | null;
  expires_at: string;
  sent_by_name: string | null;
}

export default function SignLicensingDocument() {
  const { token } = useParams<{ token: string }>();
  const [request, setRequest] = useState<RequestView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"read" | "sign">("read");
  const [confirmed, setConfirmed] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [signerName, setSignerName] = useState("");
  const [notReadyNote, setNotReadyNote] = useState("");
  const [notReadyOpen, setNotReadyOpen] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${FUNCTION_URL}?token=${encodeURIComponent(token)}`, {
        headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
      });
      const json = await res.json();
      if (!res.ok) setError(json?.message || json?.error || "This link could not be opened.");
      else {
        setRequest(json.request);
        setSignerName(json.request.signer_name || json.request.recipient_name || "");
        if (json.request.signed_at) setStep("sign");
      }
    } catch {
      setError("This link could not be opened. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const post = async (payload: Record<string, unknown>) => {
    const res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
      body: JSON.stringify({ token, ...payload }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.message || json?.error || "Something went wrong");
    return json;
  };

  const goToSignature = async () => {
    if (!confirmed) { toast.error("Please confirm you have read the document first"); return; }
    setBusy(true);
    try {
      const json = await post({ action: "mark_read" });
      setRequest(json.request);
      setStep("sign");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const sign = async () => {
    if (!signature) { toast.error("Please add your signature"); return; }
    if (!signerName.trim()) { toast.error("Please enter your full name"); return; }
    setBusy(true);
    try {
      const json = await post({ action: "sign", signature, signer_name: signerName.trim() });
      setRequest(json.request);
      toast.success("Signed — thank you");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const notReady = async () => {
    setBusy(true);
    try {
      const json = await post({ action: "not_ready", note: notReadyNote.trim() || undefined });
      setRequest(json.request);
      setNotReadyOpen(false);
      toast.success("Saved — your link stays open, come back when you are ready");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <div className="max-w-sm text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-base font-semibold">We could not open this document</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const doc = request.document;

  if (request.signed_at) {
    return (
      <div className="min-h-screen bg-muted/30 p-6 flex items-center justify-center">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 text-center space-y-3">
          <CheckCircle2 className="h-9 w-9 text-success mx-auto" />
          <p className="text-lg font-semibold">Signed</p>
          <p className="text-sm text-muted-foreground">
            {request.document_title} was signed by {request.signer_name} on{" "}
            {new Date(request.signed_at).toLocaleString("en-GB")}.
          </p>
          <p className="text-xs text-muted-foreground">
            A copy is kept with the premises records. You can close this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-28">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          {step === "sign" ? <PenLine className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-primary" />}
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{request.document_title}</p>
            <p className="text-xs text-muted-foreground">
              {step === "read" ? "Step 1 of 2 — read the document" : "Step 2 of 2 — sign"}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {step === "read" ? (
          <>
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="text-center">
                <h1 className="text-base font-bold tracking-wide">{doc.title}</h1>
                {doc.subtitle && <p className="text-xs text-muted-foreground mt-1">{doc.subtitle}</p>}
              </div>

              <div className="space-y-1 text-sm">
                {doc.facts.map((f) => (
                  <div key={f.label} className="flex gap-2">
                    <span className="font-medium shrink-0">{f.label}:</span>
                    <span className="text-muted-foreground break-words">{f.value}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3 text-sm leading-relaxed">
                {doc.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
              </div>

              {doc.nominated && doc.nominated.length > 0 && (
                <ul className="text-sm space-y-1">
                  {doc.nominated.map((n, i) => (
                    <li key={i}>{n.name} — {n.job_title}</li>
                  ))}
                </ul>
              )}

              {doc.statement && (
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">{doc.statement}</div>
              )}

              <div className="pt-3 border-t border-border space-y-1 text-sm">
                {doc.signature_block.map((f) => (
                  <div key={f.label} className="flex gap-2">
                    <span className="font-medium shrink-0">{f.label}:</span>
                    <span className="text-muted-foreground break-words">{f.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 cursor-pointer">
              <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} />
              <span className="text-sm">
                I have read this document in full and I understand it.
              </span>
            </label>

            {!notReadyOpen ? (
              <div className="space-y-2">
                <Button className="w-full" size="lg" onClick={goToSignature} disabled={busy || !confirmed}>
                  {busy ? "Saving..." : "Continue to sign"}
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setNotReadyOpen(true)}>
                  I'm not ready to sign yet
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <p className="text-sm font-medium">Not ready yet — that's fine</p>
                <p className="text-xs text-muted-foreground">
                  Your link stays open. Tell us anything you would like explained and your manager will follow up.
                </p>
                <Textarea
                  rows={3}
                  placeholder="Optional — what would you like help with?"
                  value={notReadyNote}
                  onChange={(e) => setNotReadyNote(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setNotReadyOpen(false)}>
                    Back
                  </Button>
                  <Button className="flex-1" onClick={notReady} disabled={busy}>
                    {busy ? "Saving..." : "Save for later"}
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">Your signature</p>
              </div>
              {doc.statement && <p className="text-sm text-muted-foreground">{doc.statement}</p>}
              <div className="space-y-1.5">
                <Label>Your full name</Label>
                <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} />
              </div>
              <SignaturePad onSignatureChange={setSignature} />
              <p className="text-xs text-muted-foreground">
                Your name, signature, the date and time and the device used are recorded with this document.
              </p>
            </div>

            <div className="space-y-2">
              <Button className="w-full" size="lg" onClick={sign} disabled={busy || !signature}>
                {busy ? "Saving..." : "Sign and submit"}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setStep("read")}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back to reading
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
