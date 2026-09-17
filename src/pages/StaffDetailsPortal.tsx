import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertCircle, Camera, CheckCircle2, ChevronLeft, ClipboardCheck, FileCheck2, HeartPulse,
  Landmark, Loader2, MapPin, MessageSquare, Paperclip, Pencil, Phone, ShieldCheck, User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/staff-details-portal`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type SectionKey = "personal" | "emergency" | "bank" | "rtw" | "notes";

/** UK National Insurance number format (optional field — only checked when given). */
const NI_PATTERN = /^[ABCEGHJKLMNOPRSTWXYZ][ABCEGHJKLMNPRSTWXYZ]\d{6}[A-D]$/;
export const isValidNiNumber = (raw: string) =>
  NI_PATTERN.test(raw.replace(/\s|-/g, "").toUpperCase());
export const digitsOnly = (raw: string) => raw.replace(/\D/g, "");

interface FieldDef {
  key: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  hint?: string;
  /** Confirmation fields are only used to catch typing mistakes — never shown on the check screen. */
  confirmOnly?: boolean;
}

interface StepDef {
  id: string;
  section: SectionKey;
  title: string;
  blurb: string;
  icon: typeof User;
  fields: FieldDef[];
  upload?: boolean;
}

/** Small groups of two or three questions, one screen at a time. */
const STEPS_BY_SECTION: Record<SectionKey, StepDef[]> = {
  personal: [
    {
      id: "name", section: "personal", title: "What is your name?",
      blurb: "Exactly as it appears on your passport or ID.", icon: User,
      fields: [
        { key: "forename", label: "First name", required: true },
        { key: "surname", label: "Surname", required: true },
        { key: "preferred_name", label: "Name you prefer to be called (optional)" },
      ],
    },
    {
      id: "dob_phone", section: "personal", title: "Date of birth and phone",
      blurb: "So we can reach you and check your pay is correct for your age.", icon: Phone,
      fields: [
        { key: "date_of_birth", label: "Date of birth", type: "date", required: true },
        { key: "phone", label: "Mobile number", type: "tel", required: true },
      ],
    },
    {
      id: "email", section: "personal", title: "Your email address",
      blurb: "Payslips and important messages go here.", icon: User,
      fields: [{ key: "email", label: "Email address", type: "email", required: true }],
    },
    {
      id: "address", section: "personal", title: "Where do you live?",
      blurb: "Your home address, as on your bank statements.", icon: MapPin,
      fields: [
        { key: "address_line1", label: "Address", required: true },
        { key: "address_line2", label: "Address line 2 (optional)" },
        { key: "city", label: "Town or city", required: true },
        { key: "postcode", label: "Postcode", required: true },
      ],
    },
    {
      id: "ni", section: "personal", title: "National Insurance number",
      blurb: "Leave this blank if you do not have one yet — you can still carry on.", icon: ShieldCheck,
      fields: [
        { key: "ni_number", label: "National Insurance number (optional)", placeholder: "AB123456C", hint: "Two letters, six numbers, then one letter — for example AB123456C." },
      ],

    },
  ],
  rtw: [
    {
      id: "rtw_status", section: "rtw", title: "Your right to work",
      blurb: "Required by law before you can start work in the UK.", icon: ShieldCheck,
      fields: [
        { key: "nationality", label: "Nationality", required: true },
        { key: "settlement_status", label: "Immigration status (optional)", placeholder: "e.g. British citizen, settled status" },
      ],
    },
    {
      id: "rtw_doc", section: "rtw", title: "Your document",
      blurb: "Passport, visa, BRP or share code letter. Take a photo or upload a file you already have.", icon: Camera,
      upload: true,
      fields: [
        { key: "passport_no", label: "Passport number (optional)" },
        { key: "sharing_code", label: "Share code (if you have one)" },
      ],
    },
  ],
  bank: [
    {
      id: "bank", section: "bank", title: "Bank details for pay",
      blurb: "Where your wages are paid. Only your payroll administrator can see these.", icon: Landmark,
      fields: [
        { key: "account_holder", label: "Account holder name", required: true },
        { key: "sort_code", label: "Sort code", placeholder: "00-00-00", required: true },
        {
          key: "confirm_sort_code", label: "Re-enter sort code", placeholder: "00-00-00",
          required: true, confirmOnly: true, hint: "We ask twice so a typing mistake cannot delay your pay.",
        },
      ],
    },
    {
      id: "bank_account", section: "bank", title: "Your account number",
      blurb: "Please type it twice so we know it is exactly right.", icon: Landmark,
      fields: [
        { key: "account_number", label: "Account number", placeholder: "8 digits", required: true },
        { key: "confirm_account_number", label: "Re-enter account number", placeholder: "8 digits", required: true, confirmOnly: true },
      ],
    },

  ],
  emergency: [
    {
      id: "emergency", section: "emergency", title: "Emergency contact",
      blurb: "Someone we can call if something happens at work.", icon: HeartPulse,
      fields: [
        { key: "name", label: "Contact name", required: true },
        { key: "relationship", label: "Relationship to you", required: true },
        { key: "phone", label: "Phone number", type: "tel", required: true },
      ],
    },
  ],
  notes: [],
};

/** Always the last question — anything the person wants their manager to know. */
const NOTES_STEP: StepDef = {
  id: "notes", section: "notes", title: "Anything you'd like to add?",
  blurb: "Optional — for example a name change, a start date question, or anything we should know.",
  icon: MessageSquare,
  fields: [{ key: "staff_notes", label: "Your note (optional)", multiline: true, placeholder: "Leave blank if there's nothing to add" }],
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
  prefill: { forename: string; surname: string; date_of_birth: string; nationality: string; email: string };
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
  const [editingRow, setEditingRow] = useState<string | null>(null);
  /** Set locally the moment sending succeeds, so the thank you screen never depends on re-opening the link. */
  const [sent, setSent] = useState<{ rtwPending: boolean } | null>(null);

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
            email: json.saved?.personal?.email ?? json.prefill.email ?? "",
            phone: json.saved?.personal?.phone ?? "",
            ni_number: json.saved?.personal?.ni_number ?? "",
            address_line1: json.saved?.personal?.address_line1 ?? "",
            address_line2: json.saved?.personal?.address_line2 ?? "",
            city: json.saved?.personal?.city ?? "",
            postcode: json.saved?.personal?.postcode ?? "",
          },
          emergency: { name: "", relationship: "", phone: "", ...(json.saved?.emergency ?? {}) },
          bank: { account_holder: "", bank_name: "", sort_code: "", account_number: "", ...(json.saved?.bank ?? {}) },
          rtw: {
            nationality: json.prefill.nationality ?? "",
            passport_no: "", sharing_code: "", settlement_status: "",
            ...(json.saved?.rtw ?? {}),
          },
          notes: { staff_notes: "", ...(json.saved?.notes ?? {}) },
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

  /** Confirmation boxes never leave the phone — they only guard against typing mistakes. */
  const cleanAnswers = useCallback(() => {
    const out: Record<string, Record<string, string>> = {};
    for (const [section, values] of Object.entries(answers)) {
      out[section] = Object.fromEntries(
        Object.entries(values ?? {}).filter(([k]) => !k.startsWith("confirm_")),
      );
    }
    return out;
  }, [answers]);

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
  const steps = useMemo(
    () => [...sections.flatMap((s) => STEPS_BY_SECTION[s] ?? []), NOTES_STEP],
    [sections],
  );
  const isReview = steps.length > 0 && step >= steps.length;
  const current = steps[step];

  const set = (section: string, field: string, value: string) =>
    setAnswers((a) => ({ ...a, [section]: { ...(a[section] ?? {}), [field]: value } }));

  /** Format and match checks, written the way a person would read them. */
  const problems = useCallback((stepDefs: StepDef[]) => {
    const list: string[] = [];
    for (const s of stepDefs) {
      const a = answers[s.section] ?? {};
      for (const f of s.fields) {
        if (f.required && !(a[f.key] ?? "").trim()) list.push(`${f.label} is needed`);
      }
      if (s.upload && uploads === 0) list.push("A photo or file of your document is needed");

      if (s.section === "personal") {
        const ni = (a.ni_number ?? "").trim();
        if (ni && !isValidNiNumber(ni)) {
          list.push("That National Insurance number does not look right (for example AB123456C). Leave it blank if you do not have one");
        }
      }
      if (s.section === "bank") {
        const sort = digitsOnly(a.sort_code ?? "");
        const sortAgain = digitsOnly(a.confirm_sort_code ?? "");
        const acc = digitsOnly(a.account_number ?? "");
        const accAgain = digitsOnly(a.confirm_account_number ?? "");
        if (sort && sort.length !== 6) list.push("A sort code has 6 numbers");
        if (acc && acc.length !== 8) list.push("An account number has 8 numbers");
        if (sortAgain && sort !== sortAgain) list.push("The two sort codes do not match");
        if (accAgain && acc !== accAgain) list.push("The two account numbers do not match");
      }
    }
    return list;
  }, [answers, uploads]);

  const stepProblems = useMemo(() => (current ? problems([current]) : []), [current, problems]);
  const reviewProblems = useMemo(() => problems(steps), [steps, problems]);

  const saveProgress = async () => {
    try { await post({ action: "save", answers: cleanAnswers() }); } catch { /* progress save is best effort */ }
  };

  const next = async () => {
    if (stepProblems.length > 0) {
      toast.error(stepProblems[0]);
      return;
    }
    setBusy(true);
    await saveProgress();
    setBusy(false);
    setStep(step + 1);
    window.scrollTo({ top: 0 });
  };

  const submit = async () => {
    if (reviewProblems.length > 0) {
      toast.error(reviewProblems[0]);
      return;
    }
    setBusy(true);
    try {
      const res = await post({ action: "submit", answers: cleanAnswers() });
      setSent({ rtwPending: Boolean(res.rtw_pending) });
      window.scrollTo({ top: 0 });
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

  const thankYou = (rtwPending: boolean, firstName?: string) => (
    <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
      <div className="max-w-sm text-center space-y-3">
        <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
        <h1 className="text-lg font-semibold text-foreground">
          Thank you{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-sm text-foreground">
          Everything has been sent to your manager, and it is now on your record — you will not be asked for it again.
        </p>
        <p className="text-sm text-muted-foreground">
          {rtwPending
            ? "Your right to work document will be checked by your manager, who will confirm it with you."
            : "Your manager will be in touch if anything else is needed."}
        </p>
        <p className="text-xs text-muted-foreground">
          This link is now closed. Contact your manager if something needs changing.
        </p>
      </div>
    </div>
  );

  if (sent) return thankYou(sent.rtwPending, data?.employee.first_name);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    // A closed link is a finished form, not a fault — say thank you instead of showing an error.
    if (error && /already been sent|already sent|now closed/i.test(error)) return thankYou(false);
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

  if (data.request.submitted_at) return thankYou(false, data.employee.first_name);

  const totalScreens = steps.length + 1;
  const progress = Math.round(((isReview ? steps.length : step) / totalScreens) * 100);
  const Icon = isReview ? ClipboardCheck : (current?.icon ?? User);
  const heading = isReview ? "Check your answers" : current?.title ?? "";
  const blurb = isReview
    ? "Tap anything to change it. When it all looks right, send it."
    : current?.blurb ?? "";

  const uploadInput = (label: string, capture: boolean) => (
    <label
      className={cn(
        "flex-1 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-4 text-sm font-medium text-foreground",
        busy && "opacity-60",
      )}
    >
      {capture ? <Camera className="h-4 w-4" /> : <Paperclip className="h-4 w-4" />}
      {label}
      <input
        type="file"
        accept="image/*,application/pdf"
        {...(capture ? { capture: "environment" as const } : {})}
        className="hidden"
        disabled={busy}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.currentTarget.value = ""; }}
      />
    </label>
  );

  return (
    <div className="min-h-screen bg-muted/30 pb-28">
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              Hi {data.employee.first_name || "there"}
            </p>
            <p className="text-xs text-muted-foreground">
              Step {(isReview ? steps.length : step) + 1} of {totalScreens} · {heading}
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
            <h1 className="text-base font-semibold text-foreground">{heading}</h1>
            <p className="text-sm text-muted-foreground">{blurb}</p>
          </div>
        </div>

        {!isReview && current && (
          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            {current.fields.map((f) => (
              <Field
                key={f.key}
                label={f.label}
                type={f.type}
                multiline={f.multiline}
                hint={f.hint}
                placeholder={f.placeholder}
                value={answers[current.section]?.[f.key]}
                onChange={(v) => set(current.section, f.key, v)}
              />
            ))}

            {current.upload && (
              <div className="pt-2 space-y-2">
                <Label className="text-sm">Photo or file of your document</Label>
                <p className="text-xs text-muted-foreground">
                  Make sure all four corners and the text are clear. A PDF or a photo already on your phone is fine.
                </p>
                <div className="flex gap-2">
                  {uploadInput("Take a photo", true)}
                  {uploadInput("Upload a file", false)}
                </div>
                {uploads > 0 && (
                  <p className="text-xs text-success flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {uploads} document{uploads > 1 ? "s" : ""} received
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {isReview && (
          <div className="space-y-4">
            {steps.map((s) => (
              <div key={s.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-muted/50">
                  {s.title}
                </p>
                <div className="divide-y divide-border">
                  {s.fields.filter((f) => !f.confirmOnly).map((f) => {
                    const rowId = `${s.section}.${f.key}`;
                    const value = answers[s.section]?.[f.key] ?? "";
                    const editing = editingRow === rowId;
                    return (
                      <div key={rowId} className="px-4 py-3">
                        {editing ? (
                          <div className="space-y-2">
                            <Field
                              id={`review-${s.section}-${f.key}`}
                              label={f.label}
                              type={f.type}
                              multiline={f.multiline}
                              placeholder={f.placeholder}
                              value={value}
                              onChange={(v) => set(s.section, f.key, v)}
                            />
                            <Button size="sm" variant="secondary" onClick={() => { setEditingRow(null); saveProgress(); }}>
                              Done
                            </Button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="w-full text-left flex items-center gap-3"
                            onClick={() => setEditingRow(rowId)}
                          >
                            <span className="flex-1 min-w-0">
                              <span className="block text-xs text-muted-foreground">{f.label}</span>
                              <span className={cn("block text-sm truncate", value ? "text-foreground" : "text-destructive")}>
                                {value || (f.required ? "Still needed" : "Not given")}
                              </span>
                            </span>
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {s.upload && (
                    <div className="px-4 py-3 flex items-center gap-3">
                      <FileCheck2 className={cn("h-4 w-4 shrink-0", uploads > 0 ? "text-success" : "text-destructive")} />
                      <span className="flex-1 text-sm text-foreground">
                        {uploads > 0
                          ? `${uploads} document${uploads > 1 ? "s" : ""} attached`
                          : "No document attached yet"}
                      </span>
                      <label className="text-sm font-medium text-primary">
                        {uploads > 0 ? "Add another" : "Attach"}
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          disabled={busy}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.currentTarget.value = ""; }}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Your information is stored securely and only used for your employment record.
        </p>
      </main>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background px-4 py-3">
        <div className="max-w-md mx-auto flex items-center gap-2">
          {step > 0 && (
            <Button variant="outline" size="lg" onClick={() => { setEditingRow(null); setStep(step - 1); window.scrollTo({ top: 0 }); }}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <Button size="lg" className="flex-1" onClick={isReview ? submit : next} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : isReview ? "Send my details" : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ id, label, value, onChange, type = "text", placeholder, multiline, hint }: {
  id?: string;
  label: string;
  value?: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  multiline?: boolean;
  hint?: string;
}) {
  const inputId = id ?? `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="space-y-1">
      <Label htmlFor={inputId} className="text-sm">{label}</Label>
      {multiline ? (
        <Textarea
          id={inputId}
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-24 text-base"
        />
      ) : (
        <Input
          id={inputId}
          type={type}
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 text-base"
        />
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
