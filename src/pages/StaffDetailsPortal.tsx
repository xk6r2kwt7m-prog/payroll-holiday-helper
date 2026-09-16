import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertCircle, Camera, CheckCircle2, ChevronLeft, HeartPulse, Landmark,
  Loader2, ShieldCheck, User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/staff-details-portal`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type SectionKey = "personal" | "emergency" | "bank" | "rtw";

const SECTION_META: Record<SectionKey, { title: string; blurb: string; icon: typeof User }> = {
  personal: { title: "Your personal details", blurb: "Name, date of birth, phone, home address and National Insurance number.", icon: User },
  emergency: { title: "Emergency contact", blurb: "Someone we can call if something happens at work.", icon: HeartPulse },
  bank: { title: "Bank details for pay", blurb: "Where your wages are paid. Stored securely.", icon: Landmark },
  rtw: { title: "Right to work", blurb: "Required by law before you can start work in the UK.", icon: ShieldCheck },
};

interface PortalData {
  request: {
    id: string;
    sections: SectionKey[];
    status: string;
    submitted_at: string | null;
    expires_at: string;
    requested_by_name: string | null;
    rtw_uploaded_count: number;
  };
  employee: { first_name: string; full_name: string };
  saved: Record<string, Record<string, string>>;
  prefill: { forename: string; surname: string; date_of_birth: string; nationality: string };
}

export default function StaffDetailsPortal() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [uploads, setUploads] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Record<string, string>>>({});

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${FUNCTION_URL}?token=${encodeURIComponent(token)}`, {
        headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
      });
      const json = await res.json();
      if (!res.ok) setError(json?.message || json?.error || "This link could not be opened.");
      else {
        setData(json);
        setUploads(json.request.rtw_uploaded_count ?? 0);
        setAnswers({
          personal: {
            forename: json.saved?.personal?.forename ?? json.prefill.forename ?? "",
            surname: json.saved?.personal?.surname ?? json.prefill.surname ?? "",
            preferred_name: json.saved?.personal?.preferred_name ?? "",
            date_of_birth: json.saved?.personal?.date_of_birth ?? json.prefill.date_of_birth ?? "",
            phone: json.saved?.personal?.phone ?? "",
            address_line1: json.saved?.personal?.address_line1 ?? "",
            address_line2: json.saved?.personal?.address_line2 ?? "",
            city: json.saved?.personal?.city ?? "",
            postcode: json.saved?.personal?.postcode ?? "",
          },
          emergency: { name: "", relationship: "", phone: "", ...(json.saved?.emergency ?? {}) },
          bank: { account_holder: "", bank_name: "", sort_code: "", account_number: "", ...(json.saved?.bank ?? {}) },
          rtw: {
            nationality: json.prefill.nationality ?? "",
            ni_number: "", passport_no: "", sharing_code: "", settlement_status: "",
            ...(json.saved?.rtw ?? {}),
          },
        });
        setError(null);
      }
    } catch {
      setError("We could not load your details form. Please check your connection and try again.");
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
    if (!res.ok) throw new Error(json?.error || json?.message || "Something went wrong");
    return json;
  };

  const sections = data?.request.sections ?? [];
  const current = sections[step];
  const set = (section: string, field: string, value: string) =>
    setAnswers((a) => ({ ...a, [section]: { ...(a[section] ?? {}), [field]: value } }));

  const missing = useMemo(() => {
    if (!current) return [] as string[];
    const a = answers[current] ?? {};
    const need = (k: string, label: string) => (a[k]?.trim() ? null : label);
    if (current === "personal") {
      return [need("forename", "First name"), need("surname", "Surname"), need("date_of_birth", "Date of birth"),
        need("phone", "Phone number"), need("address_line1", "Address"), need("city", "Town or city"),
        need("postcode", "Postcode")].filter(Boolean) as string[];
    }
    if (current === "emergency") {
      return [need("name", "Contact name"), need("relationship", "Relationship"), need("phone", "Phone number")]
        .filter(Boolean) as string[];
    }
    if (current === "bank") {
      return [need("account_holder", "Account holder name"), need("sort_code", "Sort code"),
        need("account_number", "Account number")].filter(Boolean) as string[];
    }
    if (current === "rtw") {
      const base = [need("nationality", "Nationality")].filter(Boolean) as string[];
      if (uploads === 0) base.push("A photo or file of your document");
      return base;
    }
    return [];
  }, [current, answers, uploads]);

  const saveProgress = async () => {
    try { await post({ action: "save", answers }); } catch { /* progress save is best effort */ }
  };

  const next = async () => {
    if (missing.length > 0) {
      toast.error(`Still needed: ${missing.join(", ")}`);
      return;
    }
    setBusy(true);
    await saveProgress();
    setBusy(false);
    if (step < sections.length - 1) {
      setStep(step + 1);
      window.scrollTo({ top: 0 });
    } else {
      submit();
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      const res = await post({ action: "submit", answers });
      toast.success(res.rtw_pending ? "Sent — your manager will check your document" : "Thank you, your details have been sent");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const upload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("That file is too large. Please keep it under 10MB.");
      return;
    }
    setBusy(true);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let i = 0; i < buf.length; i += 8192) {
        binary += String.fromCharCode(...buf.subarray(i, i + 8192));
      }
      const res = await post({
        action: "upload_rtw",
        file_name: file.name,
        mime_type: file.type || "application/octet-stream",
        file_base64: btoa(binary),
      });
      setUploads(res.uploaded ?? uploads + 1);
      toast.success("Document received");
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

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
        <div className="max-w-sm text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
          <h1 className="text-lg font-semibold text-foreground">We could not open this link</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (data.request.submitted_at) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
        <div className="max-w-sm text-center space-y-3">
          <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
          <h1 className="text-lg font-semibold text-foreground">All done, thank you</h1>
          <p className="text-sm text-muted-foreground">
            Your details have been sent to your manager. If you uploaded a right to work document, they will check it
            and confirm it with you.
          </p>
        </div>
      </div>
    );
  }

  const meta = SECTION_META[current];
  const Icon = meta.icon;
  const progress = Math.round((step / sections.length) * 100);

  return (
    <div className="min-h-screen bg-muted/30 pb-28">
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              Hi {data.employee.first_name || "there"}
            </p>
            <p className="text-xs text-muted-foreground">
              Step {step + 1} of {sections.length} · {meta.title}
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0">Ugly Dumpling</Badge>
        </div>
        <Progress value={progress} className="h-1.5 mt-2" />
      </header>

      <main className="px-4 py-5 space-y-5 max-w-md mx-auto">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">{meta.title}</h1>
            <p className="text-sm text-muted-foreground">{meta.blurb}</p>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          {current === "personal" && (
            <>
              <Field label="First name (as on your passport)" value={answers.personal?.forename} onChange={(v) => set("personal", "forename", v)} />
              <Field label="Surname" value={answers.personal?.surname} onChange={(v) => set("personal", "surname", v)} />
              <Field label="Name you prefer to be called (optional)" value={answers.personal?.preferred_name} onChange={(v) => set("personal", "preferred_name", v)} />
              <Field label="Date of birth" type="date" value={answers.personal?.date_of_birth} onChange={(v) => set("personal", "date_of_birth", v)} />
              <Field label="Mobile number" type="tel" value={answers.personal?.phone} onChange={(v) => set("personal", "phone", v)} />
              <Field label="National Insurance number (leave blank if you do not have one yet)" placeholder="QQ123456C" value={answers.personal?.ni_number} onChange={(v) => set("personal", "ni_number", v)} />
              <Field label="Address" value={answers.personal?.address_line1} onChange={(v) => set("personal", "address_line1", v)} />
              <Field label="Address line 2 (optional)" value={answers.personal?.address_line2} onChange={(v) => set("personal", "address_line2", v)} />
              <Field label="Town or city" value={answers.personal?.city} onChange={(v) => set("personal", "city", v)} />
              <Field label="Postcode" value={answers.personal?.postcode} onChange={(v) => set("personal", "postcode", v)} />
            </>
          )}

          {current === "emergency" && (
            <>
              <Field label="Contact name" value={answers.emergency?.name} onChange={(v) => set("emergency", "name", v)} />
              <Field label="Relationship to you" value={answers.emergency?.relationship} onChange={(v) => set("emergency", "relationship", v)} />
              <Field label="Phone number" type="tel" value={answers.emergency?.phone} onChange={(v) => set("emergency", "phone", v)} />
            </>
          )}

          {current === "bank" && (
            <>
              <Field label="Account holder name" value={answers.bank?.account_holder} onChange={(v) => set("bank", "account_holder", v)} />
              <Field label="Bank name (optional)" value={answers.bank?.bank_name} onChange={(v) => set("bank", "bank_name", v)} />
              <Field label="Sort code" placeholder="00-00-00" value={answers.bank?.sort_code} onChange={(v) => set("bank", "sort_code", v)} />
              <Field label="Account number" placeholder="8 digits" value={answers.bank?.account_number} onChange={(v) => set("bank", "account_number", v)} />
              <p className="text-xs text-muted-foreground">
                Only your payroll administrator can see these details.
              </p>
            </>
          )}

          {current === "rtw" && (
            <>
              <Field label="Nationality" value={answers.rtw?.nationality} onChange={(v) => set("rtw", "nationality", v)} />
              
              <Field label="Passport number (optional)" value={answers.rtw?.passport_no} onChange={(v) => set("rtw", "passport_no", v)} />
              <Field label="Share code (if you have one)" value={answers.rtw?.sharing_code} onChange={(v) => set("rtw", "sharing_code", v)} />
              <Field label="Immigration status (optional)" placeholder="e.g. British citizen, settled status" value={answers.rtw?.settlement_status} onChange={(v) => set("rtw", "settlement_status", v)} />

              <div className="pt-2 space-y-2">
                <Label className="text-sm">Photo or file of your document</Label>
                <p className="text-xs text-muted-foreground">
                  Passport, visa, BRP or share code letter. Make sure all four corners and the text are clear.
                </p>
                <label className={cn("flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-6 text-sm font-medium text-foreground", busy && "opacity-60")}>
                  <Camera className="h-4 w-4" />
                  {uploads > 0 ? "Add another document" : "Take a photo or choose a file"}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    capture="environment"
                    className="hidden"
                    disabled={busy}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.currentTarget.value = ""; }}
                  />
                </label>
                {uploads > 0 && (
                  <p className="text-xs text-success flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {uploads} document{uploads > 1 ? "s" : ""} received
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Your information is stored securely and only used for your employment record.
        </p>
      </main>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background px-4 py-3">
        <div className="max-w-md mx-auto flex items-center gap-2">
          {step > 0 && (
            <Button variant="outline" size="lg" onClick={() => { setStep(step - 1); window.scrollTo({ top: 0 }); }}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <Button size="lg" className="flex-1" onClick={next} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : step === sections.length - 1 ? "Send my details" : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      <Input
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 text-base"
      />
    </div>
  );
}
