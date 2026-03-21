import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  User, CreditCard, FileText, Clock, CheckCircle2, Upload,
  ChevronRight, ChevronLeft, Shield, AlertCircle, Loader2, Eye,
} from "lucide-react";
import { useMyOnboardingData, useUpdateOnboardingData, useSubmitOnboarding, useInitOnboardingData, type RtwStatus } from "@/hooks/useEmployeeOnboarding";
import { useUploadDocument, DOCUMENT_TYPES, type DocumentType } from "@/hooks/useEmployeeDocuments";
import { useUpsertAvailability, DAY_NAMES } from "@/hooks/useAvailability";
import { cn } from "@/lib/utils";
import ugloIcon from "@/assets/uglo-icon.png";

const STEPS = [
  { id: "personal", label: "Personal Info", icon: User },
  { id: "bank", label: "Bank Details", icon: CreditCard },
  { id: "rtw", label: "Right to Work", icon: Shield },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "availability", label: "Availability", icon: Clock },
  { id: "confirm", label: "Confirm", icon: CheckCircle2 },
];

const RTW_STATUS_LABELS: Record<RtwStatus, { label: string; color: string }> = {
  not_submitted: { label: "Not Submitted", color: "bg-muted text-muted-foreground" },
  submitted: { label: "Uploaded", color: "bg-primary/10 text-primary" },
  pending_review: { label: "Pending Manager Review", color: "bg-warning/10 text-warning" },
  approved: { label: "Approved ✓", color: "bg-success/10 text-success" },
  rejected: { label: "Resubmission Needed", color: "bg-destructive/10 text-destructive" },
};

export default function EmployeeOnboarding() {
  const { user } = useAuth();
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [employeeName, setEmployeeName] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);

  const [personal, setPersonal] = useState({
    nationality: "", ni_number: "", passport_no: "", settlement_status: "",
    sharing_code: "", residence_permit: "", phone: "", address: "", date_of_birth: "",
  });

  const [bank, setBank] = useState({
    account_name: "", sort_code: "", account_number: "",
  });

  const [emergency, setEmergency] = useState({
    name: "", relationship: "", phone: "",
  });

  const [availability, setAvailability] = useState(
    Array.from({ length: 7 }, (_, i) => ({
      day_of_week: i,
      is_available: i >= 1 && i <= 5,
      available_from: "09:00",
      available_to: "22:00",
    }))
  );

  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const { data: onboardingData } = useMyOnboardingData(employeeId || undefined);
  const updateOnboarding = useUpdateOnboardingData();
  const submitOnboarding = useSubmitOnboarding();
  const initOnboarding = useInitOnboardingData();
  const uploadDocument = useUploadDocument();
  const upsertAvailability = useUpsertAvailability();

  useEffect(() => {
    if (!user) return;
    supabase
      .from("employees")
      .select("id, forename, surname, tenant_id, status")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setEmployeeId(data.id);
          setTenantId(data.tenant_id);
          setEmployeeName(`${data.forename} ${data.surname}`);
          initOnboarding.mutate({ employeeId: data.id, tenantId: data.tenant_id });
        }
        setLoading(false);
      });
  }, [user]);

  useEffect(() => {
    if (onboardingData) {
      if (onboardingData.step_completed > 0) {
        setCurrentStep(Math.min(onboardingData.step_completed, 5));
      }
      if (onboardingData.personal_info && Object.keys(onboardingData.personal_info).length) {
        setPersonal(prev => ({ ...prev, ...onboardingData.personal_info }));
      }
      if (onboardingData.bank_details && Object.keys(onboardingData.bank_details).length) {
        setBank(prev => ({ ...prev, ...onboardingData.bank_details }));
      }
      if (onboardingData.emergency_contact && Object.keys(onboardingData.emergency_contact).length) {
        setEmergency(prev => ({ ...prev, ...onboardingData.emergency_contact }));
      }
    }
  }, [onboardingData]);

  const saveProgress = async (step: number) => {
    if (!employeeId) return;
    await updateOnboarding.mutateAsync({
      employeeId,
      updates: {
        personal_info: personal,
        bank_details: bank,
        emergency_contact: emergency,
        step_completed: step,
      },
    });
  };

  const handleNext = async () => {
    if (currentStep === 0 && !personal.nationality) {
      toast.error("Please enter your nationality");
      return;
    }
    if (currentStep === 1 && (!bank.account_number || !bank.sort_code || !bank.account_name)) {
      toast.error("Please fill in all bank details");
      return;
    }
    const nextStep = currentStep + 1;
    await saveProgress(nextStep);
    setCurrentStep(nextStep);
  };

  const handleBack = () => setCurrentStep(prev => Math.max(0, prev - 1));

  const handleFileUpload = async (file: File, docType: DocumentType, docName: string) => {
    if (!employeeId) return;
    setUploadingDoc(true);
    try {
      await uploadDocument.mutateAsync({
        employeeId, file, documentType: docType, documentName: docName,
      });
      setUploadedDocs(prev => [...prev, docType]);
      toast.success(`${docName} uploaded successfully`);
    } catch {
      toast.error("Upload failed, please try again");
    } finally {
      setUploadingDoc(false);
    }
  };

  const hasRtwDocs = uploadedDocs.includes("passport") || uploadedDocs.includes("right_to_work");

  const handleSubmit = async () => {
    if (!employeeId || !confirmed) return;
    try {
      await upsertAvailability.mutateAsync({
        employeeId,
        slots: availability.map(a => ({
          day_of_week: a.day_of_week, is_available: a.is_available,
          available_from: a.available_from, available_to: a.available_to,
        })),
      });
      await submitOnboarding.mutateAsync({
        employeeId, personalInfo: personal, bankDetails: bank,
        emergencyContact: emergency, hasRtwDocs,
      });
    } catch {
      // Error handled by mutation
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!employeeId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="h-12 w-12 text-warning mx-auto mb-3" />
          <h2 className="text-lg font-semibold mb-2">No Employee Record Found</h2>
          <p className="text-sm text-muted-foreground">Your account hasn't been linked to an employee record yet. Please contact your manager.</p>
        </div>
      </div>
    );
  }

  // Already submitted — show status
  if (onboardingData?.submitted_at) {
    const rtwStatus = (onboardingData.rtw_status || "not_submitted") as RtwStatus;
    const isApproved = !!onboardingData.onboarding_approved_at;
    const rtwInfo = RTW_STATUS_LABELS[rtwStatus];

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-sm space-y-5">
          {isApproved ? (
            <>
              <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
              <div>
                <h2 className="text-xl font-bold mb-1">Onboarding Complete</h2>
                <p className="text-sm text-muted-foreground">Your onboarding has been reviewed and approved. Welcome to the team!</p>
              </div>
            </>
          ) : (
            <>
              <Eye className="h-16 w-16 text-primary mx-auto" />
              <div>
                <h2 className="text-xl font-bold mb-1">Onboarding Submitted</h2>
                <p className="text-sm text-muted-foreground">Your information has been submitted and is now being reviewed by your manager.</p>
              </div>
              {/* RTW Status */}
              <div className="rounded-xl bg-card border border-border p-4 text-left space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Right to Work</h3>
                <Badge className={cn("text-xs", rtwInfo.color)}>{rtwInfo.label}</Badge>
                {rtwStatus === "rejected" && onboardingData.rtw_review_notes && (
                  <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3">
                    <p className="text-xs text-destructive font-medium">Manager notes:</p>
                    <p className="text-xs text-foreground mt-1">{onboardingData.rtw_review_notes}</p>
                  </div>
                )}
                {rtwStatus === "rejected" && (
                  <p className="text-xs text-muted-foreground">Please re-upload your right to work documents and contact your manager.</p>
                )}
              </div>
            </>
          )}
          <div className="space-y-2">
            <Button className="w-full" onClick={() => window.location.href = "/"}>Go to Home</Button>
            <Button variant="outline" className="w-full" onClick={() => window.location.href = "/staff"}>View My Records</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const progressPercent = ((currentStep) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 shadow-sm">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <img src={ugloIcon} alt="Logo" className="h-8 w-8 rounded-lg" />
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-foreground truncate">Welcome, {employeeName}</h1>
            <p className="text-xs text-muted-foreground">Complete your onboarding</p>
          </div>
          <span className="text-xs font-medium text-muted-foreground">{currentStep + 1}/{STEPS.length}</span>
        </div>
        <div className="max-w-lg mx-auto mt-2">
          <Progress value={progressPercent} className="h-1.5" />
        </div>
      </div>

      {/* Step indicator pills */}
      <div className="max-w-lg mx-auto px-4 pt-4">
        <div className="flex gap-1 overflow-x-auto pb-2">
          {STEPS.map((step, i) => (
            <div key={step.id} className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
              i < currentStep ? "bg-success/10 text-success" :
              i === currentStep ? "bg-primary/10 text-primary" :
              "bg-muted text-muted-foreground"
            )}>
              <step.icon className="h-3.5 w-3.5" />
              {step.label}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
            {currentStep === 0 && <PersonalInfoStep personal={personal} setPersonal={setPersonal} emergency={emergency} setEmergency={setEmergency} />}
            {currentStep === 1 && <BankDetailsStep bank={bank} setBank={setBank} />}
            {currentStep === 2 && <RightToWorkStep onUpload={handleFileUpload} uploadedDocs={uploadedDocs} uploading={uploadingDoc} />}
            {currentStep === 3 && <AdditionalDocsStep onUpload={handleFileUpload} uploadedDocs={uploadedDocs} uploading={uploadingDoc} />}
            {currentStep === 4 && <AvailabilityStep availability={availability} setAvailability={setAvailability} />}
            {currentStep === 5 && <ConfirmationStep personal={personal} bank={bank} emergency={emergency} uploadedDocs={uploadedDocs} confirmed={confirmed} setConfirmed={setConfirmed} hasRtwDocs={hasRtwDocs} />}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex gap-3 mt-8 pb-8">
          {currentStep > 0 && (
            <Button variant="outline" onClick={handleBack} className="flex-1 gap-2">
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
          )}
          {currentStep < STEPS.length - 1 ? (
            <Button onClick={handleNext} className="flex-1 gap-2" disabled={updateOnboarding.isPending}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} className="flex-1 gap-2" disabled={!confirmed || submitOnboarding.isPending}>
              {submitOnboarding.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
              ) : (
                <><CheckCircle2 className="h-4 w-4" /> Submit for Review</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// === Step Components ===

function PersonalInfoStep({ personal, setPersonal, emergency, setEmergency }: {
  personal: Record<string, string>;
  setPersonal: (fn: any) => void;
  emergency: Record<string, string>;
  setEmergency: (fn: any) => void;
}) {
  const update = (field: string, value: string) => setPersonal((p: any) => ({ ...p, [field]: value }));
  const updateE = (field: string, value: string) => setEmergency((p: any) => ({ ...p, [field]: value }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">Personal Information</h2>
        <p className="text-sm text-muted-foreground">Please provide your personal details accurately.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Date of Birth</Label>
          <Input type="date" value={personal.date_of_birth} onChange={e => update("date_of_birth", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Nationality <span className="text-destructive">*</span></Label>
          <Input value={personal.nationality} onChange={e => update("nationality", e.target.value)} placeholder="e.g., British" />
        </div>
        <div className="space-y-2">
          <Label>National Insurance Number</Label>
          <Input value={personal.ni_number} onChange={e => update("ni_number", e.target.value)} placeholder="e.g., QQ 12 34 56 C" />
        </div>
        <div className="space-y-2">
          <Label>Phone Number</Label>
          <Input value={personal.phone} onChange={e => update("phone", e.target.value)} placeholder="+44 7..." type="tel" />
        </div>
        <div className="space-y-2">
          <Label>Home Address</Label>
          <Textarea value={personal.address} onChange={e => update("address", e.target.value)} placeholder="Full address" rows={2} />
        </div>
        <div className="space-y-2">
          <Label>Settlement Status</Label>
          <Select value={personal.settlement_status} onValueChange={v => update("settlement_status", v)}>
            <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="british_citizen">British Citizen</SelectItem>
              <SelectItem value="settled">Settled Status</SelectItem>
              <SelectItem value="pre_settled">Pre-Settled Status</SelectItem>
              <SelectItem value="visa">Visa Holder</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(personal.settlement_status === "visa" || personal.settlement_status === "pre_settled") && (
          <>
            <div className="space-y-2">
              <Label>Share Code</Label>
              <Input value={personal.sharing_code} onChange={e => update("sharing_code", e.target.value)} placeholder="9-character code" />
            </div>
            <div className="space-y-2">
              <Label>Residence Permit Number</Label>
              <Input value={personal.residence_permit} onChange={e => update("residence_permit", e.target.value)} />
            </div>
          </>
        )}
      </div>

      {/* Emergency Contact */}
      <div className="pt-2">
        <h3 className="text-sm font-semibold text-foreground mb-3">Emergency Contact</h3>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Contact Name</Label>
            <Input value={emergency.name} onChange={e => updateE("name", e.target.value)} placeholder="Full name" />
          </div>
          <div className="space-y-2">
            <Label>Relationship</Label>
            <Input value={emergency.relationship} onChange={e => updateE("relationship", e.target.value)} placeholder="e.g., Partner, Parent" />
          </div>
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input value={emergency.phone} onChange={e => updateE("phone", e.target.value)} type="tel" placeholder="+44 7..." />
          </div>
        </div>
      </div>
    </div>
  );
}

function BankDetailsStep({ bank, setBank }: { bank: Record<string, string>; setBank: (fn: any) => void }) {
  const update = (field: string, value: string) => setBank((p: any) => ({ ...p, [field]: value }));
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">Bank Details</h2>
        <p className="text-sm text-muted-foreground">Your bank details are required for salary payments.</p>
      </div>
      <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 flex gap-3">
        <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">Your bank details are encrypted and only visible to authorised payroll administrators.</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Account Holder Name <span className="text-destructive">*</span></Label>
          <Input value={bank.account_name} onChange={e => update("account_name", e.target.value)} placeholder="Name as it appears on your bank account" />
        </div>
        <div className="space-y-2">
          <Label>Sort Code <span className="text-destructive">*</span></Label>
          <Input value={bank.sort_code} onChange={e => update("sort_code", e.target.value)} placeholder="00-00-00" maxLength={8} />
        </div>
        <div className="space-y-2">
          <Label>Account Number <span className="text-destructive">*</span></Label>
          <Input value={bank.account_number} onChange={e => update("account_number", e.target.value)} placeholder="8-digit account number" maxLength={8} />
        </div>
      </div>
    </div>
  );
}

function RightToWorkStep({ onUpload, uploadedDocs, uploading }: {
  onUpload: (file: File, docType: DocumentType, docName: string) => void;
  uploadedDocs: string[];
  uploading: boolean;
}) {
  const rtwDocs: { type: DocumentType; label: string; required: boolean }[] = [
    { type: "passport", label: "Passport", required: true },
    { type: "right_to_work", label: "Right to Work Proof", required: true },
    { type: "visa", label: "Visa (if applicable)", required: false },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">Right to Work Documents</h2>
        <p className="text-sm text-muted-foreground">UK employers are required to verify your right to work. Please upload clear copies of your documents.</p>
      </div>
      <div className="rounded-xl bg-warning/5 border border-warning/20 p-4 flex gap-3">
        <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Uploading these documents does not automatically confirm your right to work. Your manager will review and verify your documents separately.
        </p>
      </div>
      <div className="space-y-3">
        {rtwDocs.map(doc => (
          <DocumentUploadCard
            key={doc.type} docType={doc.type} label={doc.label} required={doc.required}
            uploaded={uploadedDocs.includes(doc.type)} uploading={uploading} onUpload={onUpload}
          />
        ))}
      </div>
    </div>
  );
}

function AdditionalDocsStep({ onUpload, uploadedDocs, uploading }: {
  onUpload: (file: File, docType: DocumentType, docName: string) => void;
  uploadedDocs: string[];
  uploading: boolean;
}) {
  const additionalDocs: { type: DocumentType; label: string }[] = [
    { type: "id_document", label: "National ID Card" },
    { type: "driving_license", label: "Driving License" },
    { type: "p45", label: "P45 from Previous Employer" },
    { type: "other", label: "Other Certificate/Document" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">Additional Documents</h2>
        <p className="text-sm text-muted-foreground">Upload any additional documents you'd like to have on file. These are optional.</p>
      </div>
      <div className="space-y-3">
        {additionalDocs.map(doc => (
          <DocumentUploadCard
            key={doc.type} docType={doc.type} label={doc.label} required={false}
            uploaded={uploadedDocs.includes(doc.type)} uploading={uploading} onUpload={onUpload}
          />
        ))}
      </div>
    </div>
  );
}

function DocumentUploadCard({ docType, label, required, uploaded, uploading, onUpload }: {
  docType: DocumentType; label: string; required: boolean; uploaded: boolean;
  uploading: boolean; onUpload: (file: File, docType: DocumentType, docName: string) => void;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file, docType, label);
  };

  return (
    <div className={cn(
      "rounded-xl border p-4 transition-all",
      uploaded ? "border-success/30 bg-success/5" : "border-border bg-card"
    )}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {uploaded ? <CheckCircle2 className="h-5 w-5 text-success shrink-0" /> : <FileText className="h-5 w-5 text-muted-foreground shrink-0" />}
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{label}</p>
            {required && !uploaded && <p className="text-xs text-destructive">Required</p>}
            {uploaded && <p className="text-xs text-success">Uploaded — pending manager review</p>}
          </div>
        </div>
        {!uploaded && (
          <label className="shrink-0">
            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleChange} disabled={uploading} />
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              uploading && "opacity-50 cursor-not-allowed"
            )}>
              <Upload className="h-3.5 w-3.5" /> Upload
            </div>
          </label>
        )}
      </div>
    </div>
  );
}

function AvailabilityStep({ availability, setAvailability }: {
  availability: { day_of_week: number; is_available: boolean; available_from: string; available_to: string }[];
  setAvailability: (a: any) => void;
}) {
  const toggle = (dayIndex: number) => {
    setAvailability((prev: any[]) => prev.map((a: any) =>
      a.day_of_week === dayIndex ? { ...a, is_available: !a.is_available } : a
    ));
  };
  const updateTime = (dayIndex: number, field: string, value: string) => {
    setAvailability((prev: any[]) => prev.map((a: any) =>
      a.day_of_week === dayIndex ? { ...a, [field]: value } : a
    ));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">Availability</h2>
        <p className="text-sm text-muted-foreground">Let your manager know when you're available to work.</p>
      </div>
      <div className="space-y-2">
        {availability.map(day => (
          <div key={day.day_of_week} className={cn(
            "rounded-xl border p-3 transition-all",
            day.is_available ? "border-primary/20 bg-primary/5" : "border-border bg-card opacity-60"
          )}>
            <div className="flex items-center justify-between">
              <button onClick={() => toggle(day.day_of_week)} className="flex items-center gap-2">
                <div className={cn(
                  "h-5 w-5 rounded-md border-2 flex items-center justify-center transition-colors",
                  day.is_available ? "bg-primary border-primary" : "border-border"
                )}>
                  {day.is_available && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                </div>
                <span className="text-sm font-medium">{DAY_NAMES[day.day_of_week]}</span>
              </button>
              {day.is_available && (
                <div className="flex items-center gap-1.5">
                  <Input type="time" value={day.available_from} onChange={e => updateTime(day.day_of_week, "available_from", e.target.value)} className="h-8 w-24 text-xs" />
                  <span className="text-xs text-muted-foreground">–</span>
                  <Input type="time" value={day.available_to} onChange={e => updateTime(day.day_of_week, "available_to", e.target.value)} className="h-8 w-24 text-xs" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfirmationStep({ personal, bank, emergency, uploadedDocs, confirmed, setConfirmed, hasRtwDocs }: {
  personal: Record<string, string>;
  bank: Record<string, string>;
  emergency: Record<string, string>;
  uploadedDocs: string[];
  confirmed: boolean;
  setConfirmed: (v: boolean) => void;
  hasRtwDocs: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">Review & Submit</h2>
        <p className="text-sm text-muted-foreground">Please review your information before submitting for manager review.</p>
      </div>

      <SummaryCard title="Personal Info" items={[
        { label: "Nationality", value: personal.nationality },
        { label: "NI Number", value: personal.ni_number || "—" },
        { label: "Phone", value: personal.phone || "—" },
        { label: "Date of Birth", value: personal.date_of_birth || "—" },
        { label: "Settlement Status", value: personal.settlement_status || "—" },
      ]} />

      <SummaryCard title="Bank Details" items={[
        { label: "Account Name", value: bank.account_name },
        { label: "Sort Code", value: bank.sort_code ? "••-••-" + bank.sort_code.slice(-2) : "—" },
        { label: "Account Number", value: bank.account_number ? "••••" + bank.account_number.slice(-4) : "—" },
      ]} />

      <SummaryCard title="Emergency Contact" items={[
        { label: "Name", value: emergency.name || "—" },
        { label: "Relationship", value: emergency.relationship || "—" },
        { label: "Phone", value: emergency.phone || "—" },
      ]} />

      <div className="rounded-xl bg-card border border-border p-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Documents Uploaded</h3>
        <p className="text-sm text-foreground">{uploadedDocs.length} document(s) uploaded</p>
        {hasRtwDocs && (
          <p className="text-xs text-warning mt-1">Right to work documents will be reviewed by your manager before approval.</p>
        )}
      </div>

      <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 flex gap-3">
        <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">What happens next?</p>
          <p className="text-xs text-muted-foreground mt-1">
            After you submit, your manager will review your information and documents. 
            Right to work documents require separate manager verification before you can be marked as work-ready. 
            You will see the status of your onboarding on your home screen.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card">
        <Checkbox id="confirm" checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} />
        <label htmlFor="confirm" className="text-sm text-foreground cursor-pointer leading-tight">
          I confirm that all information is accurate and I authorise my employer to use this data for payroll and employment purposes.
        </label>
      </div>
    </div>
  );
}

function SummaryCard({ title, items }: { title: string; items: { label: string; value: string }[] }) {
  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h3>
      </div>
      <div className="divide-y divide-border">
        {items.map(item => (
          <div key={item.label} className="px-4 py-2.5 flex justify-between">
            <span className="text-xs text-muted-foreground">{item.label}</span>
            <span className="text-sm font-medium text-foreground">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
