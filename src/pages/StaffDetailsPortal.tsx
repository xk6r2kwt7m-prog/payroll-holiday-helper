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
  Eye, EyeOff, Landmark, Loader2, MapPin, MessageSquare, Paperclip, Pencil, Phone, ShieldCheck, User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  expandRequestedFields,
  RTW_BASIS_OPTIONS,
  RTW_DOCUMENT_TYPES,
  rtwBasisNeedsExpiry,
} from "@/lib/info-request-items";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/staff-details-portal`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type SectionKey = "personal" | "emergency" | "bank" | "rtw" | "notes";

/** UK National Insurance number format (optional field — only checked when given). */
const NI_PATTERN = /^[ABCEGHJKLMNOPRSTWXYZ][ABCEGHJKLMNPRSTWXYZ]\d{6}[A-D]$/;
export const isValidNiNumber = (raw: string) =>
  NI_PATTERN.test(raw.replace(/\s|-/g, "").toUpperCase());
export const digitsOnly = (raw: string) => raw.replace(/\D/g, "");

/**
 * Telephone numbers are accepted from anywhere — a UK mobile, a landline, or an
 * international number with a country code. Only obvious nonsense is refused.
 */
export const isValidPhoneNumber = (raw: string) => {
  const trimmed = raw.trim();
  if (!/^\+?[\d\s()./-]+$/.test(trimmed)) return false;
  const digits = digitsOnly(trimmed);
  return digits.length >= 7 && digits.length <= 15;
};

/**
 * The email we already hold is shown back only partly, and cannot be changed
 * here — a wrong address has to go through the manager.
 */
export const maskEmail = (raw: string): string => {
  const email = (raw || "").trim();
  const at = email.lastIndexOf("@");
  if (at < 1) return email;
  const name = email.slice(0, at);
  const domain = email.slice(at);
  const keep = name.slice(0, Math.min(2, name.length));
  return `${keep}${"\u2022".repeat(Math.max(name.length - keep.length, 3))}${domain}`;
};

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
  /** Hidden as it is typed, with a show button — used for bank numbers. */
  masked?: boolean;
  /** A short list to choose from instead of a free-text box. */
  options?: readonly { value: string; label: string }[];
  /** Shown back but not changeable here. */
  readOnly?: boolean;
}

interface StepDef {
  id: string;
  section: SectionKey;
  title: string;
  blurb: string;
  icon: typeof User;
  fields: FieldDef[];
  upload?: boolean;
  /** Shows the "I do not have one yet" tick box. */
  noNiOption?: boolean;
  /** Shows the "I do not have a number yet" tick box. */
  noPhoneOption?: boolean;
}

/**
 * Only the things that were asked for appear, one small screen at a time.
 * Screens are built from the item keys on the request, so someone already on
 * the team who is only asked for a visa never sees the rest.
 */
function buildSteps(items: readonly string[], held?: { email?: string | null }): StepDef[] {
  const has = (k: string) => items.includes(k);
  const heldEmail = (held?.email ?? "").trim();
  const steps: StepDef[] = [];

  if (has("legal_name")) {
    steps.push({
      id: "name", section: "personal", title: "What is your name?",
      blurb: "Exactly as it appears on your passport or ID.", icon: User,
      fields: [
        { key: "forename", label: "First name", required: true },
        { key: "surname", label: "Surname", required: true },
        { key: "preferred_name", label: "Name you prefer to be called (optional)" },
      ],
    });
  }

  if (has("dob") || has("phone")) {
    steps.push({
      id: "dob_phone", section: "personal",
      title: has("dob") && has("phone") ? "Date of birth and phone" : has("dob") ? "Your date of birth" : "Your phone number",
      blurb: "So we can reach you and check your pay is correct for your age.", icon: Phone,
      noPhoneOption: has("phone"),
      fields: [
        ...(has("dob") ? [{ key: "date_of_birth", label: "Date of birth", type: "date", required: true }] : []),
        ...(has("phone")
          ? [{
              key: "phone", label: "Mobile number", type: "tel", placeholder: "07700 900123 or +351 912 345 678",
              hint: "Used only for work contact — rota changes and urgent messages. UK or international numbers are both fine.",
            }]
          : []),
      ],
    });
  }

  if (has("email")) {
    steps.push({
      id: "email", section: "personal", title: "Your email address",
      blurb: heldEmail
        ? "This is the email we hold for you."
        : "Payslips and important messages go here.", icon: User,
      fields: [{
        key: "email", label: "Email address", type: "email", required: true,
        ...(heldEmail
          ? {
              readOnly: true,
              hint: "This is the email we hold for you. If it is wrong, please speak to your manager before continuing — we cannot change it here.",
            }
          : {}),
      }],
    });
  }

  if (has("address")) {
    steps.push({
      id: "address", section: "personal", title: "Where do you live?",
      blurb: "Your home address, as on your bank statements.", icon: MapPin,
      fields: [
        { key: "address_line1", label: "Address", required: true },
        { key: "address_line2", label: "Address line 2 (optional)" },
        { key: "city", label: "Town or city", required: true },
        { key: "postcode", label: "Postcode", required: true },
      ],
    });
  }

  if (has("ni_number")) {
    steps.push({
      id: "ni", section: "personal", title: "National Insurance number",
      blurb: "If you do not have one yet, tick the box — you can still carry on.", icon: ShieldCheck,
      noNiOption: true,
      fields: [
        { key: "ni_number", label: "National Insurance number", placeholder: "AB123456C", hint: "Two letters, six numbers, then one letter — for example AB123456C." },
      ],
    });
  }

  if (has("nationality")) {
    steps.push({
      id: "rtw_status", section: "rtw", title: "Your right to work",
      blurb: "Required by law before you can work in the UK.", icon: ShieldCheck,
      fields: [
        { key: "nationality", label: "Nationality", required: true },
        {
          key: "rtw_basis", label: "How are you entitled to work in the UK?", required: true,
          options: RTW_BASIS_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
        },
        { key: "settlement_status", label: "Anything else about your status (optional)", placeholder: "e.g. skilled worker visa" },
      ],
    });
  }

  const wantsDoc = has("passport") || has("visa") || has("share_code");
  if (wantsDoc) {
    const which = has("visa")
      ? "Your visa or permit"
      : has("passport")
        ? "Your passport"
        : "Your share code";
    steps.push({
      id: "rtw_doc", section: "rtw", title: which,
      blurb: "Take a photo or upload a file you already have, and tell us when it runs out.", icon: Camera,
      upload: true,
      fields: [
        {
          key: "document_type", label: "Which document are you sending?", required: true,
          options: RTW_DOCUMENT_TYPES.map((d) => ({ value: d.value, label: d.label })),
          hint: "Please choose before taking a photo, so it is filed correctly.",
        },
        ...(has("passport") ? [{ key: "passport_no", label: "Passport number (optional)" }] : []),
        ...(has("share_code") ? [{ key: "sharing_code", label: "Share code", placeholder: "e.g. W12 3AB 456" }] : []),
        {
          key: "expires_at", label: "Date your permission runs out", type: "date",
          hint: "British and Irish citizens and people with settled status can leave this blank — there is nothing that expires.",
        },
      ],
    });
  }

  if (has("bank")) {
    steps.push(
      {
        id: "bank", section: "bank", title: "Bank details for pay",
        blurb: "Where your wages are paid. Only your payroll administrator can see these.", icon: Landmark,
        fields: [
          { key: "account_holder", label: "Account holder name", required: true },
          { key: "sort_code", label: "Sort code", placeholder: "00-00-00", required: true, masked: true },
          {
            key: "confirm_sort_code", label: "Re-enter sort code", placeholder: "00-00-00",
            required: true, confirmOnly: true, masked: true,
            hint: "Hidden as you type, and asked twice so a typing mistake cannot delay your pay.",
          },
        ],
      },
      {
        id: "bank_account", section: "bank", title: "Your account number",
        blurb: "Please type it twice so we know it is exactly right.", icon: Landmark,
        fields: [
          { key: "account_number", label: "Account number", placeholder: "8 digits", required: true, masked: true },
          { key: "confirm_account_number", label: "Re-enter account number", placeholder: "8 digits", required: true, confirmOnly: true, masked: true },
        ],
      },
    );
  }

  if (has("emergency")) {
    steps.push({
      id: "emergency", section: "emergency", title: "Emergency contact",
      blurb: "Someone we can call if something happens at work.", icon: HeartPulse,
      fields: [
        { key: "name", label: "Contact name", required: true },
        { key: "relationship", label: "Relationship to you", required: true },
        { key: "phone", label: "Phone number", type: "tel", required: true },
      ],
    });
  }

  return steps;
}

export const buildPortalSteps = buildSteps;

/** Shown on every pay screen, so nobody is fooled by a message pretending to be us. */
export const PAYROLL_SECURITY_NOTICE =
  "Ugly Dumpling will never ask for your online-banking password, PIN, card security code or verification code.";

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
    /** Item keys. Older links send section keys, which the server expands. */
    items?: string[];
    sections: SectionKey[];
    kind?: string;
    status: string;
    submitted_at: string | null;
    expires_at: string;
    requested_by_name: string | null;
    rtw_uploaded_count: number;
    contract_document_id?: string | null;
    contract_sign_path?: string | null;
    last_saved_at?: string | null;
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
  const [sent, setSent] = useState<{ rtwPending: boolean; contractPath?: string | null } | null>(null);
  /** The opening screen is shown until they choose to start. */
  const [started, setStarted] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [noNi, setNoNi] = useState(false);
  const [noPhone, setNoPhone] = useState(false);

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
        setSavedAt(json.request.last_saved_at ?? null);
        setNoNi(json.saved?.personal?.no_ni_number === "yes");
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

  const items = useMemo(
    () => expandRequestedFields(data?.request.items ?? data?.request.sections ?? []),
    [data?.request.items, data?.request.sections],
  );
  const steps = useMemo(() => [...buildSteps(items), NOTES_STEP], [items]);
  const isReview = steps.length > 0 && step >= steps.length;
  const current = steps[step];

  const setNoNiChoice = (value: boolean) => {
    setNoNi(value);
    setAnswers((a) => ({
      ...a,
      personal: { ...(a.personal ?? {}), no_ni_number: value ? "yes" : "", ...(value ? { ni_number: "" } : {}) },
    }));
  };

  const setNoPhoneChoice = (value: boolean) => {
    setNoPhone(value);
    setAnswers((a) => ({
      ...a,
      personal: { ...(a.personal ?? {}), no_phone_number: value ? "yes" : "", ...(value ? { phone: "" } : {}) },
    }));
  };

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
        if (!ni && !noNi && s.noNiOption) {
          list.push("Please give your National Insurance number, or tick that you do not have one yet");
        }
        if (ni && !isValidNiNumber(ni)) {
          list.push("That National Insurance number does not look right (for example AB123456C). Leave it blank if you do not have one");
        }
        const phone = (a.phone ?? "").trim();
        if (s.noPhoneOption && !phone && !noPhone) {
          list.push("Please give a phone number, or tick that you do not have one yet");
        }
        if (phone && !isValidPhoneNumber(phone)) {
          list.push("That phone number does not look right — include the country code for a number outside the UK");
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
  }, [answers, uploads, noNi, noPhone]);

  const stepProblems = useMemo(() => (current ? problems([current]) : []), [current, problems]);
  const reviewProblems = useMemo(() => problems(steps), [steps, problems]);

  const saveProgress = useCallback(async () => {
    try {
      await post({ action: "save", answers: cleanAnswers() });
      setSavedAt(new Date().toISOString());
    } catch {
      /* saving again shortly is enough — nothing typed is lost from the screen */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanAnswers, token]);

  /**
   * Answers save on their own a couple of seconds after typing stops, so the
   * form can be closed and picked up again later on any device.
   */
  useEffect(() => {
    if (!data || !started || data.request.submitted_at || sent) return;
    const timer = setTimeout(() => { void saveProgress(); }, 2000);
    return () => clearTimeout(timer);
  }, [answers, noNi, noPhone, data, started, sent, saveProgress]);

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
      setSent({
        rtwPending: Boolean(res.rtw_pending),
        contractPath: (res.contract_sign_path as string | null) ?? data?.request.contract_sign_path ?? null,
      });
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
        expires_at: (answers.rtw?.expires_at ?? "").trim() || null,
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

  const thankYou = (rtwPending: boolean, firstName?: string, contractPath?: string | null) => (
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
        {contractPath && (
          <Button size="lg" className="w-full" onClick={() => { window.location.href = contractPath; }}>
            Continue to your contract
          </Button>
        )}
        <p className="text-xs text-muted-foreground">
          This link is now read-only. Contact your manager if something needs changing.
        </p>
      </div>
    </div>
  );

  if (sent) return thankYou(sent.rtwPending, data?.employee.first_name, sent.contractPath);

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

  if (data.request.submitted_at)
    return thankYou(false, data.employee.first_name, data.request.contract_sign_path);

  // Opening screen: who is asking, why, and how long the link lasts.
  if (!started) {
    const expires = new Date(data.request.expires_at);
    const expiresLabel = expires.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const askedFor = steps.filter((st) => st.id !== "notes").map((st) => st.title);
    return (
      <div className="min-h-screen bg-muted/30 px-4 py-8">
        <div className="max-w-md mx-auto space-y-5">
          <div className="text-center space-y-2">
            <Badge variant="outline" className="text-[10px]">Ugly Dumpling</Badge>
            <h1 className="text-xl font-semibold text-foreground">
              Hi {data.employee.first_name || "there"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Ugly Dumpling needs a few details to add you to the team properly — for your
              employment record, to pay you correctly, and to meet the checks we are required
              by law to complete.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              What we will ask for
            </p>
            <ul className="text-sm text-foreground space-y-1">
              {askedFor.map((title) => <li key={title}>• {title}</li>)}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-2 text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>
                This link is yours alone. Your answers save as you go, so you can close this
                page and come back before sending.
              </span>
            </p>
            <p className="flex items-start gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>It takes about five minutes, and the link works until {expiresLabel}.</span>
            </p>
            {savedAt && (
              <p className="text-xs text-success">
                You have already started this form — your answers are still here.
              </p>
            )}
          </div>

          <Button size="lg" className="w-full" onClick={() => setStarted(true)}>
            {savedAt ? "Carry on where I left off" : "Start"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            {PAYROLL_SECURITY_NOTICE}
          </p>
        </div>
      </div>
    );
  }

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
        <p className="text-[10px] text-muted-foreground mt-1">
          {savedAt ? "Saved — you can close this page and come back" : "Your answers save as you go"}
        </p>
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

            {current.noNiOption && (
              <label className="flex items-start gap-2 pt-1 text-sm text-foreground">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={noNi}
                  onChange={(e) => setNoNiChoice(e.target.checked)}
                />
                <span>I do not have a National Insurance number yet</span>
              </label>
            )}

            {current.noPhoneOption && (
              <label className="flex items-start gap-2 pt-1 text-sm text-foreground">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={noPhone}
                  onChange={(e) => setNoPhoneChoice(e.target.checked)}
                />
                <span>I do not have a number yet</span>
              </label>
            )}

            {current.section === "bank" && (
              <p className="text-xs text-muted-foreground border-t border-border pt-3">
                {PAYROLL_SECURITY_NOTICE}
              </p>
            )}

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
