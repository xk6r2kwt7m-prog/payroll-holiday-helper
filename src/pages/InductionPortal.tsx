import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { SignaturePad } from "@/components/letters/SignaturePad";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  FileText, ExternalLink, CheckCircle2, AlertCircle, Loader2, Wine, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PackItem {
  id: string;
  document_name: string;
  document_category: string | null;
  document_version: number | null;
  requires_signature: boolean;
  acknowledged_at: string | null;
  view_url: string | null;
}

interface PortalData {
  pack: {
    id: string;
    branch: string | null;
    staff_role: string | null;
    status: string;
    completed_at: string | null;
    includes_alcohol: boolean;
    final_statement_text: string | null;
    issued_by_name: string | null;
  };
  employee: { name: string; first_name: string };
  items: PackItem[];
  alcohol: { id: string; status: string; employee_signed_at: string | null } | null;
}

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/induction-portal`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export default function InductionPortal() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [itemSignatures, setItemSignatures] = useState<Record<string, string>>({});
  const [alcoholSignature, setAlcoholSignature] = useState<string>("");
  const [finalSignature, setFinalSignature] = useState<string>("");
  const [finalAgreed, setFinalAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${FUNCTION_URL}?token=${encodeURIComponent(token)}`, {
        headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.message || json?.error || "This link could not be opened.");
      } else {
        setData(json);
        setError(null);
      }
    } catch {
      setError("We could not load your induction. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const post = async (payload: Record<string, unknown>) => {
    const res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
      body: JSON.stringify({ token, ...payload }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Something went wrong");
    return json;
  };

  const acknowledge = async (item: PackItem) => {
    setBusyItem(item.id);
    try {
      await post({
        action: "acknowledge_item",
        item_id: item.id,
        signature_data: item.requires_signature ? itemSignatures[item.id] : undefined,
      });
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyItem(null);
    }
  };

  const confirmAlcohol = async () => {
    setBusyItem("alcohol");
    try {
      await post({ action: "acknowledge_alcohol", signature_data: alcoholSignature });
      toast.success("Alcohol-sales acknowledgement recorded");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyItem(null);
    }
  };

  const complete = async () => {
    setSubmitting(true);
    try {
      await post({ action: "complete", signature_data: finalSignature });
      toast.success("Induction completed — thank you");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-sm">
          <AlertCircle className="h-12 w-12 text-warning mx-auto mb-3" />
          <h1 className="text-lg font-semibold mb-2">Link unavailable</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const total = data.items.length;
  const done = data.items.filter(i => i.acknowledged_at).length;
  const allDone = total > 0 && done === total;
  const alcoholSigned = !data.pack.includes_alcohol || !!data.alcohol?.employee_signed_at;
  const completed = !!data.pack.completed_at;

  if (completed) {
    return (
      <div className="min-h-screen bg-background p-5">
        <div className="max-w-lg mx-auto pt-12 text-center">
          <CheckCircle2 className="h-14 w-14 text-success mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">All done, {data.employee.first_name}</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Your induction was completed and saved to your staff record. Your manager has a copy.
          </p>
          <div className="rounded-xl border border-border bg-card p-4 text-left space-y-2">
            {data.items.map(i => (
              <div key={i.id} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                <span className="truncate">{i.document_name}</span>
                {i.document_version ? (
                  <span className="text-xs text-muted-foreground">v{i.document_version}</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="max-w-lg mx-auto p-5 space-y-5">
        <header className="space-y-2">
          <h1 className="text-xl font-bold">Welcome, {data.employee.first_name}</h1>
          <p className="text-sm text-muted-foreground">
            Please read each document and confirm it. It only takes a few minutes and works on your phone.
          </p>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {data.pack.branch && <Badge variant="outline">{data.pack.branch}</Badge>}
            {data.pack.staff_role && <Badge variant="outline">{data.pack.staff_role}</Badge>}
          </div>
        </header>

        <div className="space-y-2">
          <Progress value={total ? (done / total) * 100 : 0} className="h-2" />
          <p className="text-xs text-muted-foreground">{done} of {total} confirmed</p>
        </div>

        <div className="space-y-3">
          {data.items.map(item => {
            const isDone = !!item.acknowledged_at;
            return (
              <div
                key={item.id}
                className={cn(
                  "rounded-xl border p-4 space-y-3",
                  isDone ? "border-success/30 bg-success/5" : "border-border bg-card"
                )}
              >
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{item.document_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.document_category}
                      {item.document_version ? ` · version ${item.document_version}` : ""}
                      {item.requires_signature ? " · signature required" : ""}
                    </p>
                  </div>
                  {isDone && <CheckCircle2 className="h-5 w-5 text-success shrink-0" />}
                </div>

                {item.view_url && (
                  <a
                    href={item.view_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> View or download
                  </a>
                )}

                {!isDone && item.requires_signature && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Sign below</p>
                    <SignaturePad onSignatureChange={(sig) => setItemSignatures(s => ({ ...s, [item.id]: sig }))} />
                  </div>
                )}

                {!isDone && (
                  <Button
                    size="sm"
                    className="w-full min-h-[44px]"
                    disabled={busyItem === item.id || (item.requires_signature && !itemSignatures[item.id])}
                    onClick={() => acknowledge(item)}
                  >
                    {busyItem === item.id ? "Saving..." : "I have read and understood this"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {data.pack.includes_alcohol && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Wine className="h-5 w-5 text-primary" />
              <p className="text-sm font-semibold">Alcohol sales acknowledgement</p>
            </div>
            <p className="text-xs text-muted-foreground">
              I confirm I have been trained on age verification (Challenge 25), the refusal-of-sale procedure,
              the premises licence conditions and the refusal/incident book, and I accept written authorisation
              to sell alcohol at this branch under the supervision of the premises licence holder or DPS.
            </p>
            {data.alcohol?.employee_signed_at ? (
              <div className="flex items-center gap-2 text-sm text-success">
                <ShieldCheck className="h-4 w-4" /> Signed — awaiting confirmation from your manager
              </div>
            ) : (
              <>
                <SignaturePad onSignatureChange={setAlcoholSignature} />
                <Button
                  size="sm"
                  className="w-full min-h-[44px]"
                  disabled={!alcoholSignature || busyItem === "alcohol"}
                  onClick={confirmAlcohol}
                >
                  {busyItem === "alcohol" ? "Saving..." : "Confirm alcohol-sales acknowledgement"}
                </Button>
              </>
            )}
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-semibold">Final confirmation</p>
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <Checkbox checked={finalAgreed} onCheckedChange={(v) => setFinalAgreed(v === true)} className="mt-0.5" />
            <span>{data.pack.final_statement_text}</span>
          </label>
          <SignaturePad onSignatureChange={setFinalSignature} />
          <Button
            className="w-full min-h-[48px]"
            disabled={!allDone || !alcoholSigned || !finalAgreed || !finalSignature || submitting}
            onClick={complete}
          >
            {submitting ? "Submitting..." : "Complete my induction"}
          </Button>
          {!allDone && (
            <p className="text-xs text-muted-foreground text-center">
              Confirm every document above to finish.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
